/**
 * Geometry is the raw, GPU-agnostic vertex data. It's a triangle soup —
 * non-indexed — because the MeshCutter creates new vertices per cut and
 * keeping it index-free keeps the algorithm simple.
 *
 *   positions: [x,y,z, x,y,z, ...]    (3 floats per vertex)
 *   normals:   [nx,ny,nz, ...]        (3 floats per vertex)
 *
 * Total vertex count = positions.length / 3, triangle count = that / 3.
 */

export interface Geometry {
  positions: Float32Array;
  normals: Float32Array;
}

/** Number of triangles in a geometry. */
export const geometryTriCount = (g: Geometry): number =>
  g.positions.length / 9;

/** Compute axis-aligned bounding box (in local space). */
export const geometryBounds = (
  g: Geometry,
): { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number }; center: { x: number; y: number; z: number } } => {
  const p = g.positions;
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i],
      y = p[i + 1],
      z = p[i + 2];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }
  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
    center: {
      x: (minX + maxX) * 0.5,
      y: (minY + maxY) * 0.5,
      z: (minZ + maxZ) * 0.5,
    },
  };
};
