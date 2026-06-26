import { v3, v3Normalize, type Vec3 } from "../math/Vec3";

/** Scene-wide lighting (one directional + global ambient). */
export class Lighting {
  /** World-space direction the light travels in (points away from sun). */
  direction: Vec3 = v3Normalize(v3(-0.6, -1, -0.4));
  color: Vec3 = v3(1.0, 0.97, 0.92);
  ambient: Vec3 = v3(0.22, 0.24, 0.28);
}
