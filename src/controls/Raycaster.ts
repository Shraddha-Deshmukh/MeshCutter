/**
 * Screen-to-world ray construction and triangle-mesh intersection. Used by
 * the CutManager for picking & post-cut piece dragging.
 *
 * The mesh's positions are local — we transform the ray *into* mesh local
 * space before intersecting so we don't have to transform every triangle.
 */

import type { Camera } from "../core/Camera";
import type { Mesh } from "../core/Mesh";
import { m4Invert, m4Multiply, type Mat4 } from "../math/Mat4";
import {
  rayTriangleIntersection,
  type Ray,
} from "../math/Ray";
import {
  v3,
  v3Normalize,
  v3Sub,
  v3TransformDirMat4,
  v3TransformMat4,
  type Vec3,
} from "../math/Vec3";

/** Convert pixel (clientX/Y on the canvas) to a world-space ray. */
export const screenToWorldRay = (
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  camera: Camera,
): Ray => {
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * 2 - 1;
  const y = -(((clientY - rect.top) / rect.height) * 2 - 1);

  const viewProj = m4Multiply(camera.projMatrix, camera.viewMatrix);
  const inv = m4Invert(viewProj);
  if (!inv) {
    return { origin: camera.getEye(), direction: v3(0, 0, -1) };
  }

  const near = v3TransformMat4({ x, y, z: -1 }, inv);
  const far = v3TransformMat4({ x, y, z: 1 }, inv);
  const dir = v3Normalize(v3Sub(far, near));
  return { origin: camera.getEye(), direction: dir };
};

export interface RayHit {
  mesh: Mesh;
  /** Distance along ray. */
  t: number;
  /** World-space hit point. */
  point: Vec3;
}

/** Intersect a ray with a single mesh's triangles. Returns the nearest hit. */
export const intersectMesh = (
  ray: Ray,
  mesh: Mesh,
  inverseModel?: Mat4,
): RayHit | null => {
  const invModel = inverseModel ?? m4Invert(mesh.getModelMatrix());
  if (!invModel) return null;

  // Transform ray into mesh-local space (cheaper than transforming every tri)
  const localOrigin = v3TransformMat4(ray.origin, invModel);
  const localDir = v3Normalize(v3TransformDirMat4(ray.direction, invModel));
  const localRay: Ray = { origin: localOrigin, direction: localDir };

  const pos = mesh.geometry.positions;
  let bestT = Infinity;
  for (let i = 0; i < pos.length; i += 9) {
    const a: Vec3 = { x: pos[i], y: pos[i + 1], z: pos[i + 2] };
    const b: Vec3 = { x: pos[i + 3], y: pos[i + 4], z: pos[i + 5] };
    const c: Vec3 = { x: pos[i + 6], y: pos[i + 7], z: pos[i + 8] };
    const hit = rayTriangleIntersection(localRay, a, b, c, false);
    if (hit && hit.t < bestT) bestT = hit.t;
  }
  if (bestT === Infinity) return null;

  // Convert local t to world t: ray.direction is unit; localDir was normalized,
  // so we recompute the world hit point from the world ray to stay precise.
  const worldPoint: Vec3 = {
    x: ray.origin.x + ray.direction.x * 0,
    y: ray.origin.y + ray.direction.y * 0,
    z: ray.origin.z + ray.direction.z * 0,
  };
  // Re-intersect the same triangle in world space would be expensive; instead
  // walk the local hit point back to world space via the mesh model matrix.
  const localHit: Vec3 = {
    x: localOrigin.x + localDir.x * bestT,
    y: localOrigin.y + localDir.y * bestT,
    z: localOrigin.z + localDir.z * bestT,
  };
  const worldHit = v3TransformMat4(localHit, mesh.getModelMatrix());
  worldPoint.x = worldHit.x;
  worldPoint.y = worldHit.y;
  worldPoint.z = worldHit.z;

  // Distance along the world ray = projection of (worldHit - origin) onto dir
  const wt =
    (worldHit.x - ray.origin.x) * ray.direction.x +
    (worldHit.y - ray.origin.y) * ray.direction.y +
    (worldHit.z - ray.origin.z) * ray.direction.z;

  return { mesh, t: wt, point: worldPoint };
};

/** Pick the closest mesh under the ray from a list. */
export const pickMesh = (ray: Ray, meshes: Mesh[]): RayHit | null => {
  let best: RayHit | null = null;
  for (const m of meshes) {
    if (!m.visible) continue;
    const hit = intersectMesh(ray, m);
    if (hit && (!best || hit.t < best.t)) best = hit;
  }
  return best;
};
