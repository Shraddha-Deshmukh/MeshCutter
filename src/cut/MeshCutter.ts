/**
 * Generic mesh cutter — purely geometric. Accepts any triangle-soup Geometry
 * and a cutting Plane, returns two new Geometries (one per side of the plane).
 *
 *   Algorithm per triangle
 *   ----------------------
 *   1. Compute signed distance from each vertex to the plane.
 *   2. If all three are on the same side → emit the triangle unchanged on
 *      that side.
 *   3. Otherwise, walk the edges. On each edge that crosses the plane,
 *      generate an intersection vertex (linear interpolation of position and
 *      normal). Each side ends up with a convex polygon (3 or 4 vertices)
 *      which we fan-triangulate.
 *
 *   Cap construction
 *   ----------------
 *   Every split triangle contributes one cut-edge (2 points on the plane).
 *   These edges chain into one or more closed loops (planar polygons). For
 *   each loop:
 *     • compute centroid C
 *     • detect winding by comparing cross(p[0]-C, p[1]-C) with plane.normal
 *     • emit fan triangles (C, A, B) for the negative cap (faces +n) and
 *       (C, B, A) for the positive cap (faces -n)
 *
 *   No shape-specific logic — works for cubes, spheres, tori, cylinders, or
 *   anything else that's a triangle soup.
 */

import type { Geometry } from "../geometry/Geometry";
import {
  planeSignedDistance,
  type Plane,
} from "../math/Plane";
import {
  v3,
  v3Cross,
  v3Dot,
  v3Lerp,
  v3Normalize,
  v3Scale,
  v3Sub,
  type Vec3,
} from "../math/Vec3";

const EPS = 1e-6;

interface Vertex {
  p: Vec3;
  n: Vec3;
}

export interface CutResult {
  positive: Geometry | null;
  negative: Geometry | null;
}

export class MeshCutter {
  /**
   * Cut `geometry` with `plane`. Returns the two halves; either side may be
   * null if the plane misses the mesh entirely (everything ended up on one
   * side).
   */
  static cut(geometry: Geometry, plane: Plane): CutResult {
    const posPos: number[] = [];
    const posNor: number[] = [];
    const negPos: number[] = [];
    const negNor: number[] = [];
    /** Cut edges produced by triangle splits; each is a segment on the plane. */
    const cutEdges: Array<{ a: Vec3; b: Vec3 }> = [];

    const pos = geometry.positions;
    const nor = geometry.normals;

    for (let i = 0; i < pos.length; i += 9) {
      const v0: Vertex = {
        p: v3(pos[i], pos[i + 1], pos[i + 2]),
        n: v3(nor[i], nor[i + 1], nor[i + 2]),
      };
      const v1: Vertex = {
        p: v3(pos[i + 3], pos[i + 4], pos[i + 5]),
        n: v3(nor[i + 3], nor[i + 4], nor[i + 5]),
      };
      const v2: Vertex = {
        p: v3(pos[i + 6], pos[i + 7], pos[i + 8]),
        n: v3(nor[i + 6], nor[i + 7], nor[i + 8]),
      };

      const d0 = planeSignedDistance(plane, v0.p);
      const d1 = planeSignedDistance(plane, v1.p);
      const d2 = planeSignedDistance(plane, v2.p);

      // Trivial accept on one side
      if (d0 >= -EPS && d1 >= -EPS && d2 >= -EPS) {
        emitTri(posPos, posNor, v0, v1, v2);
        continue;
      }
      if (d0 <= EPS && d1 <= EPS && d2 <= EPS) {
        emitTri(negPos, negNor, v0, v1, v2);
        continue;
      }

      // Mixed — split the triangle
      splitTriangle(
        [v0, v1, v2],
        [d0, d1, d2],
        posPos,
        posNor,
        negPos,
        negNor,
        cutEdges,
      );
    }

    // Build caps from accumulated cut edges
    if (cutEdges.length > 0) {
      buildCaps(cutEdges, plane, posPos, posNor, negPos, negNor);
    }

    return {
      positive: makeGeometry(posPos, posNor),
      negative: makeGeometry(negPos, negNor),
    };
  }
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const makeGeometry = (pos: number[], nor: number[]): Geometry | null => {
  if (pos.length === 0) return null;
  return {
    positions: new Float32Array(pos),
    normals: new Float32Array(nor),
  };
};

const pushVertex = (
  posOut: number[],
  norOut: number[],
  v: Vertex,
): void => {
  posOut.push(v.p.x, v.p.y, v.p.z);
  norOut.push(v.n.x, v.n.y, v.n.z);
};

const emitTri = (
  posOut: number[],
  norOut: number[],
  a: Vertex,
  b: Vertex,
  c: Vertex,
): void => {
  pushVertex(posOut, norOut, a);
  pushVertex(posOut, norOut, b);
  pushVertex(posOut, norOut, c);
};

/** Fan-triangulate a convex polygon (≥3 vertices). */
const fanTriangulate = (
  poly: Vertex[],
  posOut: number[],
  norOut: number[],
): void => {
  for (let i = 1; i < poly.length - 1; i++) {
    emitTri(posOut, norOut, poly[0], poly[i], poly[i + 1]);
  }
};

/** Linear-interpolate position + normal between two vertices. */
const lerpVertex = (a: Vertex, b: Vertex, t: number): Vertex => ({
  p: v3Lerp(a.p, b.p, t),
  n: v3Normalize(v3Lerp(a.n, b.n, t)),
});

const splitTriangle = (
  verts: [Vertex, Vertex, Vertex],
  dists: [number, number, number],
  posPos: number[],
  posNor: number[],
  negPos: number[],
  negNor: number[],
  cutEdges: Array<{ a: Vec3; b: Vec3 }>,
): void => {
  const positivePoly: Vertex[] = [];
  const negativePoly: Vertex[] = [];
  const intersections: Vertex[] = [];

  for (let i = 0; i < 3; i++) {
    const j = (i + 1) % 3;
    const curr = verts[i];
    const next = verts[j];
    const dc = dists[i];
    const dn = dists[j];

    if (dc >= -EPS) positivePoly.push(curr);
    if (dc <= EPS) negativePoly.push(curr);

    // Only strict sign changes contribute new intersection points;
    // an on-plane vertex is shared between sides without creating a new vertex.
    const crosses = (dc > EPS && dn < -EPS) || (dc < -EPS && dn > EPS);
    if (crosses) {
      const t = dc / (dc - dn);
      const inter = lerpVertex(curr, next, t);
      positivePoly.push(inter);
      negativePoly.push(inter);
      intersections.push(inter);
    }
  }

  if (positivePoly.length >= 3) fanTriangulate(positivePoly, posPos, posNor);
  if (negativePoly.length >= 3) fanTriangulate(negativePoly, negPos, negNor);

  if (intersections.length === 2) {
    cutEdges.push({ a: intersections[0].p, b: intersections[1].p });
  }
};

// ---------- cap building ----------

/**
 * Hash a point to an integer key with quantisation so floating-point siblings
 * collapse onto the same id.
 */
const QUANT = 1e5;
const pointKey = (p: Vec3): string =>
  `${Math.round(p.x * QUANT)}|${Math.round(p.y * QUANT)}|${Math.round(p.z * QUANT)}`;

const buildCaps = (
  cutEdges: Array<{ a: Vec3; b: Vec3 }>,
  plane: Plane,
  posPos: number[],
  posNor: number[],
  negPos: number[],
  negNor: number[],
): void => {
  // Deduplicate intersection points → integer ids
  const idMap = new Map<string, number>();
  const points: Vec3[] = [];
  const idOf = (p: Vec3): number => {
    const k = pointKey(p);
    const existing = idMap.get(k);
    if (existing !== undefined) return existing;
    const id = points.length;
    points.push(p);
    idMap.set(k, id);
    return id;
  };

  // Build adjacency list — each vertex of a closed loop should have degree 2
  const adj: number[][] = [];
  for (const e of cutEdges) {
    const ia = idOf(e.a);
    const ib = idOf(e.b);
    if (ia === ib) continue;
    while (adj.length <= Math.max(ia, ib)) adj.push([]);
    adj[ia].push(ib);
    adj[ib].push(ia);
  }

  // Walk closed loops
  const visited = new Uint8Array(points.length);
  const loops: number[][] = [];
  for (let start = 0; start < points.length; start++) {
    if (visited[start]) continue;
    if (!adj[start] || adj[start].length === 0) continue;

    const loop: number[] = [start];
    visited[start] = 1;
    let prev = -1;
    let curr = start;
    let closed = false;

    // Step until we get back to start or hit a dead end
    while (true) {
      const neighbors = adj[curr];
      let next = -1;
      for (const n of neighbors) {
        if (n === prev) continue;
        if (n === start && loop.length >= 3) {
          closed = true;
          break;
        }
        if (!visited[n]) {
          next = n;
          break;
        }
      }
      if (closed) break;
      if (next === -1) break;
      visited[next] = 1;
      loop.push(next);
      prev = curr;
      curr = next;
    }

    if (closed && loop.length >= 3) loops.push(loop);
  }

  // Emit cap triangles per loop
  for (const loop of loops) {
    capLoop(loop, points, plane, posPos, posNor, negPos, negNor);
  }
};

const capLoop = (
  loopIds: number[],
  points: Vec3[],
  plane: Plane,
  posPos: number[],
  posNor: number[],
  negPos: number[],
  negNor: number[],
): void => {
  // Centroid of the loop
  let cx = 0,
    cy = 0,
    cz = 0;
  for (const id of loopIds) {
    cx += points[id].x;
    cy += points[id].y;
    cz += points[id].z;
  }
  const inv = 1 / loopIds.length;
  const centroid: Vec3 = { x: cx * inv, y: cy * inv, z: cz * inv };

  // Detect winding: if cross(p0-C, p1-C) points along +plane.normal, the loop
  // is already CCW from the +normal side. Otherwise reverse.
  const a = v3Sub(points[loopIds[0]], centroid);
  const b = v3Sub(points[loopIds[1 % loopIds.length]], centroid);
  const cross = v3Cross(a, b);
  const ccwFromPos = v3Dot(cross, plane.normal) >= 0;
  const ordered = ccwFromPos ? loopIds : loopIds.slice().reverse();

  const nPos = v3Scale(plane.normal, 1); // for negative cap (faces +n)
  const nNeg = v3Scale(plane.normal, -1); // for positive cap (faces -n)

  const cv: Vertex = { p: centroid, n: nPos };
  const cvNeg: Vertex = { p: centroid, n: nNeg };

  for (let i = 0; i < ordered.length; i++) {
    const A = points[ordered[i]];
    const B = points[ordered[(i + 1) % ordered.length]];

    // Negative side cap: (C, A, B) → normal = +plane.normal
    emitTri(
      negPos,
      negNor,
      cv,
      { p: A, n: nPos },
      { p: B, n: nPos },
    );

    // Positive side cap: (C, B, A) → normal = -plane.normal
    emitTri(
      posPos,
      posNor,
      cvNeg,
      { p: B, n: nNeg },
      { p: A, n: nNeg },
    );
  }
};
