import {
  v3Add,
  v3Cross,
  v3Dot,
  v3Scale,
  v3Sub,
  type Vec3,
} from "./Vec3";
import { planeSignedDistance, type Plane } from "./Plane";

export interface Ray {
  origin: Vec3;
  /** Unit-length direction. */
  direction: Vec3;
}

/** Returns t such that ray.origin + t*ray.direction lies on plane, or null. */
export const rayPlaneIntersection = (
  ray: Ray,
  plane: Plane,
): { t: number; point: Vec3 } | null => {
  const denom = v3Dot(plane.normal, ray.direction);
  if (Math.abs(denom) < 1e-8) return null;
  const t = (plane.d - v3Dot(plane.normal, ray.origin)) / denom;
  if (t < 0) return null;
  return { t, point: v3Add(ray.origin, v3Scale(ray.direction, t)) };
};

/** Möller–Trumbore triangle intersection. Returns t along ray, or null. */
export const rayTriangleIntersection = (
  ray: Ray,
  a: Vec3,
  b: Vec3,
  c: Vec3,
  cullBackface = false,
): { t: number; u: number; v: number } | null => {
  const edge1 = v3Sub(b, a);
  const edge2 = v3Sub(c, a);
  const pvec = v3Cross(ray.direction, edge2);
  const det = v3Dot(edge1, pvec);

  if (cullBackface && det < 1e-8) return null;
  if (Math.abs(det) < 1e-12) return null;

  const invDet = 1 / det;
  const tvec = v3Sub(ray.origin, a);
  const u = v3Dot(tvec, pvec) * invDet;
  if (u < 0 || u > 1) return null;

  const qvec = v3Cross(tvec, edge1);
  const v = v3Dot(ray.direction, qvec) * invDet;
  if (v < 0 || u + v > 1) return null;

  const t = v3Dot(edge2, qvec) * invDet;
  if (t < 0) return null;
  return { t, u, v };
};

/** Side test relative to plane: +1 / -1 / 0 (within eps). */
export const planeSide = (plane: Plane, p: Vec3, eps = 1e-6): number => {
  const d = planeSignedDistance(plane, p);
  if (d > eps) return 1;
  if (d < -eps) return -1;
  return 0;
};
