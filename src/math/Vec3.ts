/**
 * Minimal Vec3 — operates on plain {x,y,z} objects. All ops return new objects
 * unless the name ends in `Mut` (mutates first argument).
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export const v3 = (x = 0, y = 0, z = 0): Vec3 => ({ x, y, z });

export const v3Copy = (a: Vec3): Vec3 => ({ x: a.x, y: a.y, z: a.z });

export const v3Set = (out: Vec3, x: number, y: number, z: number): Vec3 => {
  out.x = x;
  out.y = y;
  out.z = z;
  return out;
};

export const v3Add = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x + b.x,
  y: a.y + b.y,
  z: a.z + b.z,
});

export const v3Sub = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
});

export const v3Scale = (a: Vec3, s: number): Vec3 => ({
  x: a.x * s,
  y: a.y * s,
  z: a.z * s,
});

export const v3Neg = (a: Vec3): Vec3 => ({ x: -a.x, y: -a.y, z: -a.z });

export const v3Dot = (a: Vec3, b: Vec3): number =>
  a.x * b.x + a.y * b.y + a.z * b.z;

export const v3Cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});

export const v3Length = (a: Vec3): number =>
  Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);

export const v3LengthSq = (a: Vec3): number =>
  a.x * a.x + a.y * a.y + a.z * a.z;

export const v3DistSq = (a: Vec3, b: Vec3): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
};

export const v3Dist = (a: Vec3, b: Vec3): number => Math.sqrt(v3DistSq(a, b));

export const v3Normalize = (a: Vec3): Vec3 => {
  const len = v3Length(a);
  if (len < 1e-12) return { x: 0, y: 0, z: 0 };
  const inv = 1 / len;
  return { x: a.x * inv, y: a.y * inv, z: a.z * inv };
};

export const v3Lerp = (a: Vec3, b: Vec3, t: number): Vec3 => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  z: a.z + (b.z - a.z) * t,
});

export const v3Equals = (a: Vec3, b: Vec3, eps = 1e-6): boolean =>
  Math.abs(a.x - b.x) < eps &&
  Math.abs(a.y - b.y) < eps &&
  Math.abs(a.z - b.z) < eps;

/** Transform vec3 as point by 4x4 matrix (column-major in a Float32Array(16)). */
export const v3TransformMat4 = (a: Vec3, m: Float32Array): Vec3 => {
  const x = a.x;
  const y = a.y;
  const z = a.z;
  const w = m[3] * x + m[7] * y + m[11] * z + m[15] || 1;
  return {
    x: (m[0] * x + m[4] * y + m[8] * z + m[12]) / w,
    y: (m[1] * x + m[5] * y + m[9] * z + m[13]) / w,
    z: (m[2] * x + m[6] * y + m[10] * z + m[14]) / w,
  };
};

/** Transform vec3 as direction (ignore translation). */
export const v3TransformDirMat4 = (a: Vec3, m: Float32Array): Vec3 => ({
  x: m[0] * a.x + m[4] * a.y + m[8] * a.z,
  y: m[1] * a.x + m[5] * a.y + m[9] * a.z,
  z: m[2] * a.x + m[6] * a.y + m[10] * a.z,
});
