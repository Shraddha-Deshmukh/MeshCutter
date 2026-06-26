import type { Mat4 } from "./Mat4";

/**
 * Column-major 3x3 stored as Float32Array(9) — used as the normal matrix
 * (inverse-transpose of upper-left 3x3 of model matrix).
 */
export type Mat3 = Float32Array;

export const m3Create = (): Mat3 => new Float32Array(9);

/** Build normal matrix = transpose(inverse(upper-left 3x3 of mat4)). */
export const m3NormalFromMat4 = (m: Mat4, out: Mat3 = m3Create()): Mat3 => {
  const a00 = m[0],
    a01 = m[1],
    a02 = m[2];
  const a10 = m[4],
    a11 = m[5],
    a12 = m[6];
  const a20 = m[8],
    a21 = m[9],
    a22 = m[10];

  const b01 = a22 * a11 - a12 * a21;
  const b11 = -a22 * a10 + a12 * a20;
  const b21 = a21 * a10 - a11 * a20;

  let det = a00 * b01 + a01 * b11 + a02 * b21;
  if (!det) {
    out.fill(0);
    out[0] = out[4] = out[8] = 1;
    return out;
  }
  det = 1.0 / det;

  // inverse (transposed of cofactor / det), then transpose to get normal matrix
  // For a 3x3 mat: normalMatrix = transpose(inverse(M)) = cofactor(M)/det
  out[0] = b01 * det;
  out[1] = (-a22 * a01 + a02 * a21) * det;
  out[2] = (a12 * a01 - a02 * a11) * det;
  out[3] = b11 * det;
  out[4] = (a22 * a00 - a02 * a20) * det;
  out[5] = (-a12 * a00 + a02 * a10) * det;
  out[6] = b21 * det;
  out[7] = (-a21 * a00 + a01 * a20) * det;
  out[8] = (a11 * a00 - a01 * a10) * det;
  return out;
};
