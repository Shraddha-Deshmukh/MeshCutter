/**
 * CutManager — central state machine for cutting & part interaction.
 *
 *   ┌──────────────┐   click on part     ┌─────────────┐
 *   │   Navigate   │ ─────────────────▶  │   Drag      │
 *   │ (orbit/zoom) │ ◀───── pointerup ── │   piece     │
 *   └──────────────┘                     └─────────────┘
 *           │  C key  ▲
 *           ▼         │  C key
 *   ┌──────────────┐
 *   │     Cut      │  drag → preview line → release → run MeshCutter
 *   └──────────────┘
 *
 * All cutting/drag logic lives here. UI subscribes via events; scene setup
 * just hands meshes off via `registerCuttable`.
 */

import type { Camera } from "../core/Camera";
import { Mesh } from "../core/Mesh";
import type { Scene } from "../core/Scene";
import type { OrbitControls } from "../controls/OrbitControls";
import {
  pickMesh,
  screenToWorldRay,
  type RayHit,
} from "../controls/Raycaster";
import { planeFromNormalPoint, type Plane } from "../math/Plane";
import { rayPlaneIntersection } from "../math/Ray";
import {
  v3,
  v3Add,
  v3Copy,
  v3Cross,
  v3Dot,
  v3Normalize,
  v3Scale,
  v3Sub,
  type Vec3,
} from "../math/Vec3";
import { MeshCutter } from "./MeshCutter";

export type CutMode = "navigate" | "cut";

export interface CutPreview {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

type ModeListener = (mode: CutMode) => void;
type PreviewListener = (preview: CutPreview | null) => void;
type PartCountListener = (count: number) => void;

const MIN_CUT_PIXELS_SQ = 12 * 12;
/** How far apart the two halves are pushed after a cut, in world units. */
const SEPARATION = 0.06;

export class CutManager {
  private _mode: CutMode = "navigate";

  /** All cuttable meshes in the scene (originals + fragments). */
  private readonly parts = new Set<Mesh>();

  private cutState: CutPreview | null = null;
  private dragState: {
    mesh: Mesh;
    pickPlane: Plane;
    offset: Vec3;
  } | null = null;

  private readonly modeListeners: ModeListener[] = [];
  private readonly previewListeners: PreviewListener[] = [];
  private readonly partCountListeners: PartCountListener[] = [];

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly gl: WebGL2RenderingContext,
    private readonly scene: Scene,
    private readonly camera: Camera,
    private readonly orbit: OrbitControls,
  ) {
    // Pointer events — registered FIRST so we get them before OrbitControls
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);

    window.addEventListener("keydown", this.onKey);
  }

  get mode(): CutMode {
    return this._mode;
  }

  setMode(mode: CutMode): void {
    if (this._mode === mode) return;
    // any in-flight gesture is invalid in the new mode
    this.cancelGesture();
    this._mode = mode;
    this.canvas.classList.toggle("cut-mode", mode === "cut");
    for (const cb of this.modeListeners) cb(mode);
  }

  toggleMode(): void {
    this.setMode(this._mode === "cut" ? "navigate" : "cut");
  }

  // ----- registration -----

  /** Hand a mesh to the manager so it can be cut & dragged. */
  registerCuttable(mesh: Mesh, isOriginal = true): void {
    mesh.isPart = !isOriginal;
    this.parts.add(mesh);
    this.scene.meshes.includes(mesh) || this.scene.add(mesh);
    this.fireCount();
  }

  /** Remove a mesh from cuttables and from the scene. */
  unregister(mesh: Mesh): void {
    if (!this.parts.has(mesh)) return;
    this.parts.delete(mesh);
    this.scene.remove(mesh);
    this.fireCount();
  }

  /** Remove every cuttable mesh from the scene. */
  clearAll(): void {
    for (const m of [...this.parts]) this.unregister(m);
    this.cancelGesture();
  }

  get partCount(): number {
    return this.parts.size;
  }

  // ----- subscriptions -----

  onModeChange(cb: ModeListener): void {
    this.modeListeners.push(cb);
  }

  onCutPreview(cb: PreviewListener): void {
    this.previewListeners.push(cb);
  }

  onPartCountChange(cb: PartCountListener): void {
    this.partCountListeners.push(cb);
  }

  // ----- input handling -----

  private onKey = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    if (e.key === "c" || e.key === "C") this.toggleMode();
    if (e.key === "Escape") this.setMode("navigate");
  };

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return; // only left mouse

    if (this._mode === "cut") {
      this.beginCut(e);
    } else {
      const ray = screenToWorldRay(e.clientX, e.clientY, this.canvas, this.camera);
      const hit = pickMesh(ray, [...this.parts]);
      if (hit) this.beginDrag(e, hit);
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (this.cutState) {
      this.cutState.endX = e.clientX;
      this.cutState.endY = e.clientY;
      this.firePreview();
    } else if (this.dragState) {
      const ray = screenToWorldRay(
        e.clientX,
        e.clientY,
        this.canvas,
        this.camera,
      );
      const hit = rayPlaneIntersection(ray, this.dragState.pickPlane);
      if (hit) {
        this.dragState.mesh.position = v3Add(hit.point, this.dragState.offset);
      }
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (this.cutState) {
      const cut = this.cutState;
      this.cutState = null;
      this.firePreview();
      this.performCut(cut);
      this.orbit.enabled = true;
    } else if (this.dragState) {
      this.dragState = null;
      this.orbit.enabled = true;
    }
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  };

  // ----- gesture starters -----

  private beginCut(e: PointerEvent): void {
    this.cutState = {
      startX: e.clientX,
      startY: e.clientY,
      endX: e.clientX,
      endY: e.clientY,
    };
    this.orbit.cancel();
    this.orbit.enabled = false;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    e.stopImmediatePropagation();
    this.firePreview();
  }

  private beginDrag(e: PointerEvent, hit: RayHit): void {
    // Construct a pick plane through the hit point, facing the camera so
    // the mouse can drag in screen-parallel motion.
    const eye = this.camera.getEye();
    const forward = v3Normalize(v3Sub(this.camera.target, eye));
    const planeNormal = v3Scale(forward, -1);
    const pickPlane = planeFromNormalPoint(planeNormal, hit.point);
    const offset = v3Sub(hit.mesh.position, hit.point);
    this.dragState = { mesh: hit.mesh, pickPlane, offset };
    this.orbit.cancel();
    this.orbit.enabled = false;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    e.stopImmediatePropagation();
  }

  private cancelGesture(): void {
    this.cutState = null;
    this.dragState = null;
    this.orbit.enabled = true;
    this.firePreview();
  }

  // ----- the actual cut -----

  private performCut(cut: CutPreview): void {
    const dx = cut.endX - cut.startX;
    const dy = cut.endY - cut.startY;
    if (dx * dx + dy * dy < MIN_CUT_PIXELS_SQ) return;

    const rayStart = screenToWorldRay(
      cut.startX,
      cut.startY,
      this.canvas,
      this.camera,
    );
    const rayEnd = screenToWorldRay(
      cut.endX,
      cut.endY,
      this.canvas,
      this.camera,
    );

    // The cutting plane passes through both rays. Both originate at the
    // camera eye, so the plane contains the eye. Its normal is perpendicular
    // to both ray directions.
    const cross = v3Cross(rayStart.direction, rayEnd.direction);
    const normal = v3Normalize(cross);
    if (!isFinite(normal.x) || !isFinite(normal.y) || !isFinite(normal.z))
      return;
    const eye = this.camera.getEye();
    const plane: Plane = { normal, d: v3Dot(normal, eye) };

    const toAdd: Mesh[] = [];
    const toRemove: Mesh[] = [];

    for (const part of this.parts) {
      // World-space plane → mesh-local space. Mesh has no rotation/scale —
      // only translation — so the normal is unchanged and only d shifts.
      const localPlane: Plane = {
        normal: plane.normal,
        d: plane.d - v3Dot(plane.normal, part.position),
      };

      const result = MeshCutter.cut(part.geometry, localPlane);
      if (
        result.positive &&
        result.negative &&
        result.positive.positions.length > 0 &&
        result.negative.positions.length > 0
      ) {
        const pos = new Mesh(this.gl, result.positive);
        pos.position = v3Copy(part.position);
        pos.color = jitterColor(part.color, 0.04);
        pos.isPart = true;
        pos.recenterGeometry();
        pos.position = v3Add(pos.position, v3Scale(plane.normal, SEPARATION));

        const neg = new Mesh(this.gl, result.negative);
        neg.position = v3Copy(part.position);
        neg.color = jitterColor(part.color, -0.04);
        neg.isPart = true;
        neg.recenterGeometry();
        neg.position = v3Sub(neg.position, v3Scale(plane.normal, SEPARATION));

        toAdd.push(pos, neg);
        toRemove.push(part);
      }
    }

    for (const m of toRemove) this.unregister(m);
    for (const m of toAdd) this.registerCuttable(m, false);
  }

  private firePreview(): void {
    for (const cb of this.previewListeners) cb(this.cutState);
  }

  private fireCount(): void {
    for (const cb of this.partCountListeners) cb(this.parts.size);
  }
}

// Small helper to nudge colours of the two halves apart for visual feedback
const jitterColor = (c: Vec3, amt: number): Vec3 => ({
  x: clamp01(c.x + amt),
  y: clamp01(c.y + amt * 0.7),
  z: clamp01(c.z + amt * 0.4),
});
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

// re-export so main.ts doesn't need a separate import
export { v3 };
