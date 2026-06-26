
import {
  m4LookAt,
  m4Perspective,
  type Mat4,
} from "../math/Mat4";
import { v3, type Vec3 } from "../math/Vec3";

export class Camera {
  /** Look-at target, in world space. */
  target: Vec3 = v3(0, 0, 0);
  /** Spherical radius from target. */
  radius = 6;
  /** Horizontal angle in radians (around world Y). */
  azimuth = Math.PI * 0.25;
  /** Vertical angle in radians from +Y down (clamped within (0, π)). */
  polar = Math.PI * 0.35;

  fovY = (45 * Math.PI) / 180;
  near = 0.1;
  far = 200;
  aspect = 1;

  readonly viewMatrix: Mat4;
  readonly projMatrix: Mat4;

  constructor() {
    this.viewMatrix = new Float32Array(16);
    this.projMatrix = new Float32Array(16);
  }

  /** Compute eye position from spherical coords. */
  getEye(): Vec3 {
    const sp = Math.sin(this.polar);
    const cp = Math.cos(this.polar);
    const sa = Math.sin(this.azimuth);
    const ca = Math.cos(this.azimuth);
    return {
      x: this.target.x + this.radius * sp * sa,
      y: this.target.y + this.radius * cp,
      z: this.target.z + this.radius * sp * ca,
    };
  }

  update(viewportWidth: number, viewportHeight: number): void {
    this.aspect = viewportWidth / Math.max(1, viewportHeight);
    m4Perspective(
      this.fovY,
      this.aspect,
      this.near,
      this.far,
      this.projMatrix,
    );
    const eye = this.getEye();
    m4LookAt(eye, this.target, v3(0, 1, 0), this.viewMatrix);
  }
}
