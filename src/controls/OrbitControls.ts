/**
 * Standard orbit / pan / zoom controls on the canvas. Drives the Camera by
 * mutating its target & spherical angles. Can be disabled by the CutManager
 * for the duration of a cut gesture.
 */

import type { Camera } from "../core/Camera";
import {
  v3,
  v3Add,
  v3Cross,
  v3Normalize,
  v3Scale,
  v3Sub,
  type Vec3,
} from "../math/Vec3";

const MIN_POLAR = 0.05;
const MAX_POLAR = Math.PI - 0.05;
const MIN_RADIUS = 1.5;
const MAX_RADIUS = 60;

export class OrbitControls {
  enabled = true;

  /** Drag rotation speed (radians per pixel). */
  rotateSpeed = 0.0065;
  panSpeed = 0.0025;
  zoomSpeed = 0.001;

  private dragging: "orbit" | "pan" | null = null;
  private lastX = 0;
  private lastY = 0;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly camera: Camera,
  ) {
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
  }

  /** Force-end any drag (called when CutManager seizes the pointer). */
  cancel(): void {
    this.dragging = null;
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (!this.enabled) return;
    // Middle or right → pan; left → orbit. Shift+left also pans.
    const isPan = e.button === 1 || e.button === 2 || e.shiftKey;
    this.dragging = isPan ? "pan" : "orbit";
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.enabled || !this.dragging) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;

    if (this.dragging === "orbit") {
      this.camera.azimuth -= dx * this.rotateSpeed;
      this.camera.polar = clamp(
        this.camera.polar - dy * this.rotateSpeed,
        MIN_POLAR,
        MAX_POLAR,
      );
    } else {
      // pan: move target in the camera's local right/up plane
      const eye = this.camera.getEye();
      const forward = v3Normalize(v3Sub(this.camera.target, eye));
      const right = v3Normalize(v3Cross(forward, v3(0, 1, 0)));
      const up = v3Normalize(v3Cross(right, forward));
      const distScale = Math.max(0.2, this.camera.radius) * this.panSpeed;
      const offset: Vec3 = v3Add(
        v3Scale(right, -dx * distScale),
        v3Scale(up, dy * distScale),
      );
      this.camera.target = v3Add(this.camera.target, offset);
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    this.dragging = null;
  };

  private onWheel = (e: WheelEvent): void => {
    if (!this.enabled) return;
    e.preventDefault();
    const factor = Math.exp(e.deltaY * this.zoomSpeed);
    this.camera.radius = clamp(
      this.camera.radius * factor,
      MIN_RADIUS,
      MAX_RADIUS,
    );
  };
}

const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v));
