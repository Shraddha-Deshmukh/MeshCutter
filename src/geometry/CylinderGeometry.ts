import type { Geometry } from "./Geometry";

/**
 * Open or closed cylinder with axis = Y. Side normals are radial, cap
 * normals are ±Y for flat shading.
 */
export const createCylinderGeometry = (
  radius = 0.85,
  height = 1.8,
  radialSegments = 36,
): Geometry => {
  const halfH = height * 0.5;
  // side: radialSegments quads * 2 tris * 3 verts
  // each cap: radialSegments triangles * 3 verts
  const sideVerts = radialSegments * 6;
  const capVerts = radialSegments * 3 * 2;
  const total = sideVerts + capVerts;
  const positions = new Float32Array(total * 3);
  const normals = new Float32Array(total * 3);

  let idx = 0;
  const push = (
    x: number,
    y: number,
    z: number,
    nx: number,
    ny: number,
    nz: number,
  ) => {
    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;
    normals[idx * 3] = nx;
    normals[idx * 3 + 1] = ny;
    normals[idx * 3 + 2] = nz;
    idx++;
  };

  for (let i = 0; i < radialSegments; i++) {
    const t0 = (i / radialSegments) * Math.PI * 2;
    const t1 = ((i + 1) / radialSegments) * Math.PI * 2;
    const c0 = Math.cos(t0);
    const s0 = Math.sin(t0);
    const c1 = Math.cos(t1);
    const s1 = Math.sin(t1);

    const x0 = c0 * radius;
    const z0 = s0 * radius;
    const x1 = c1 * radius;
    const z1 = s1 * radius;

    // side quad → 2 triangles. Normals are radial.
    push(x0, -halfH, z0, c0, 0, s0);
    push(x1, -halfH, z1, c1, 0, s1);
    push(x1, halfH, z1, c1, 0, s1);

    push(x0, -halfH, z0, c0, 0, s0);
    push(x1, halfH, z1, c1, 0, s1);
    push(x0, halfH, z0, c0, 0, s0);

    // top cap (Y = +halfH), normal +Y, wind CCW from above
    push(0, halfH, 0, 0, 1, 0);
    push(x0, halfH, z0, 0, 1, 0);
    push(x1, halfH, z1, 0, 1, 0);

    // bottom cap (Y = -halfH), normal -Y, wind CCW from below
    push(0, -halfH, 0, 0, -1, 0);
    push(x1, -halfH, z1, 0, -1, 0);
    push(x0, -halfH, z0, 0, -1, 0);
  }

  return { positions, normals };
};
