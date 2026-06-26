import { v3Cross, v3Dot, v3Normalize, v3Sub, type Vec3 } from "./Vec3";

/**
 * Plane in Hessian normal form: n·x = d, where n is unit length.
 * Signed distance of point p = n·p - d  (positive = "front" / n-side).
 */
export interface Plane {
  normal: Vec3;
  d: number;
}

export const planeFromNormalPoint = (n: Vec3, p: Vec3): Plane => {
  const normal = v3Normalize(n);
  return { normal, d: v3Dot(normal, p) };
};

export const planeFromThreePoints = (a: Vec3, b: Vec3, c: Vec3): Plane => {
  const ab = v3Sub(b, a);
  const ac = v3Sub(c, a);
  return planeFromNormalPoint(v3Cross(ab, ac), a);
};

export const planeSignedDistance = (plane: Plane, p: Vec3): number =>
  v3Dot(plane.normal, p) - plane.d;
