import type { Geometry } from "./Geometry";

/**
 * Axis-aligned cube centred at origin. Each face has flat shading via 6
 * independent vertices that share the face normal. Size is full edge length.
 */
export const createCubeGeometry = (size = 1.5): Geometry => {
  const s = size * 0.5;

  // 6 faces × 2 triangles × 3 vertices = 36 verts
  const positions = new Float32Array(36 * 3);
  const normals = new Float32Array(36 * 3);

  let i = 0;
  const push = (p: number[], n: number[]) => {
    positions[i * 3 + 0] = p[0];
    positions[i * 3 + 1] = p[1];
    positions[i * 3 + 2] = p[2];
    normals[i * 3 + 0] = n[0];
    normals[i * 3 + 1] = n[1];
    normals[i * 3 + 2] = n[2];
    i++;
  };

  const face = (
    a: number[],
    b: number[],
    c: number[],
    d: number[],
    n: number[],
  ) => {
    push(a, n);
    push(b, n);
    push(c, n);
    push(a, n);
    push(c, n);
    push(d, n);
  };

  // +X
  face([s, -s, s], [s, -s, -s], [s, s, -s], [s, s, s], [1, 0, 0]);
  // -X
  face([-s, -s, -s], [-s, -s, s], [-s, s, s], [-s, s, -s], [-1, 0, 0]);
  // +Y
  face([-s, s, s], [s, s, s], [s, s, -s], [-s, s, -s], [0, 1, 0]);
  // -Y
  face([-s, -s, -s], [s, -s, -s], [s, -s, s], [-s, -s, s], [0, -1, 0]);
  // +Z
  face([-s, -s, s], [s, -s, s], [s, s, s], [-s, s, s], [0, 0, 1]);
  // -Z
  face([s, -s, -s], [-s, -s, -s], [-s, s, -s], [s, s, -s], [0, 0, -1]);

  return { positions, normals };
};
