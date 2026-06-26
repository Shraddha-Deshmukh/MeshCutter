import type { Geometry } from "./Geometry";

/**
 * UV sphere centred at origin. Smooth shading — each vertex's normal is the
 * unit position vector. Built as a triangle soup (no shared vertices) so the
 * cutter can split it without dealing with an index buffer.
 */
export const createSphereGeometry = (
  radius = 1,
  widthSegments = 32,
  heightSegments = 24,
): Geometry => {
  const triCount = widthSegments * heightSegments * 2;
  const positions = new Float32Array(triCount * 3 * 3);
  const normals = new Float32Array(triCount * 3 * 3);

  const point = (u: number, v: number, out: number[]): void => {
    const theta = u * Math.PI * 2;
    const phi = v * Math.PI;
    const sp = Math.sin(phi);
    out[0] = radius * Math.cos(theta) * sp;
    out[1] = radius * Math.cos(phi);
    out[2] = radius * Math.sin(theta) * sp;
  };

  let idx = 0;
  const a: number[] = [0, 0, 0];
  const b: number[] = [0, 0, 0];
  const c: number[] = [0, 0, 0];
  const d: number[] = [0, 0, 0];

  const push = (p: number[]) => {
    positions[idx * 3] = p[0];
    positions[idx * 3 + 1] = p[1];
    positions[idx * 3 + 2] = p[2];
    // smooth normal: position / radius
    const inv = 1 / Math.max(1e-8, Math.hypot(p[0], p[1], p[2]));
    normals[idx * 3] = p[0] * inv;
    normals[idx * 3 + 1] = p[1] * inv;
    normals[idx * 3 + 2] = p[2] * inv;
    idx++;
  };

  for (let y = 0; y < heightSegments; y++) {
    const v0 = y / heightSegments;
    const v1 = (y + 1) / heightSegments;
    for (let x = 0; x < widthSegments; x++) {
      const u0 = x / widthSegments;
      const u1 = (x + 1) / widthSegments;
      point(u0, v0, a);
      point(u1, v0, b);
      point(u1, v1, c);
      point(u0, v1, d);
      // Two CCW triangles when viewed from outside
      push(a);
      push(d);
      push(c);
      push(a);
      push(c);
      push(b);
    }
  }

  return { positions, normals };
};
