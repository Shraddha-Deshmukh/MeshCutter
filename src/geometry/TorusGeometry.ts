import type { Geometry } from "./Geometry";

/**
 * Torus centred on origin, axis = Y. R is the major radius (centre of tube
 * → centre of torus), r is the minor radius (tube thickness).
 */
export const createTorusGeometry = (
  R = 1.1,
  r = 0.4,
  majorSegments = 48,
  minorSegments = 18,
): Geometry => {
  const triCount = majorSegments * minorSegments * 2;
  const positions = new Float32Array(triCount * 3 * 3);
  const normals = new Float32Array(triCount * 3 * 3);

  const point = (
    u: number,
    v: number,
    pos: number[],
    nrm: number[],
  ): void => {
    const tu = u * Math.PI * 2;
    const tv = v * Math.PI * 2;
    const cu = Math.cos(tu);
    const su = Math.sin(tu);
    const cv = Math.cos(tv);
    const sv = Math.sin(tv);
    // centre of tube on the XZ plane
    const cx = R * cu;
    const cz = R * su;
    pos[0] = cx + r * cv * cu;
    pos[1] = r * sv;
    pos[2] = cz + r * cv * su;
    // normal = unit vector from tube centre to vertex
    nrm[0] = cv * cu;
    nrm[1] = sv;
    nrm[2] = cv * su;
  };

  let idx = 0;
  const a: number[] = [0, 0, 0];
  const b: number[] = [0, 0, 0];
  const c: number[] = [0, 0, 0];
  const d: number[] = [0, 0, 0];
  const an: number[] = [0, 0, 0];
  const bn: number[] = [0, 0, 0];
  const cn: number[] = [0, 0, 0];
  const dn: number[] = [0, 0, 0];

  const push = (p: number[], n: number[]) => {
    positions[idx * 3] = p[0];
    positions[idx * 3 + 1] = p[1];
    positions[idx * 3 + 2] = p[2];
    normals[idx * 3] = n[0];
    normals[idx * 3 + 1] = n[1];
    normals[idx * 3 + 2] = n[2];
    idx++;
  };

  for (let i = 0; i < majorSegments; i++) {
    const u0 = i / majorSegments;
    const u1 = (i + 1) / majorSegments;
    for (let j = 0; j < minorSegments; j++) {
      const v0 = j / minorSegments;
      const v1 = (j + 1) / minorSegments;
      point(u0, v0, a, an);
      point(u1, v0, b, bn);
      point(u1, v1, c, cn);
      point(u0, v1, d, dn);
      push(a, an);
      push(c, cn);
      push(d, dn);
      push(a, an);
      push(b, bn);
      push(c, cn);
    }
  }

  return { positions, normals };
};
