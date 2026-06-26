/**
 * Entry point. Wires together:
 *   • Engine        — owns the WebGL2 context, renders Scenes
 *   • Scene         — meshes + lighting + camera
 *   • OrbitControls — orbit/pan/zoom on the canvas
 *   • CutManager    — modes, cut gesture, post-cut piece dragging
 *   • UI            — title screen, mode HUD, shape switcher, cut preview
 *
 * Order matters in two places:
 *   1. OrbitControls' pointer listeners must be registered BEFORE
 *      CutManager's so that when CutManager claims a gesture (via
 *      orbit.cancel() + orbit.enabled = false), the orbit listener which
 *      already ran in the same event dispatch is harmlessly neutralised.
 *   2. We render every frame regardless of state so the title screen has a
 *      live, rotating backdrop.
 */

import "./style.css";
import { Engine } from "./core/Engine";
import { Scene } from "./core/Scene";
import { Mesh } from "./core/Mesh";
import { OrbitControls } from "./controls/OrbitControls";
import { CutManager } from "./cut/CutManager";
import { TitleScreen } from "./ui/TitleScreen";
import { ModeHUD } from "./ui/ModeHUD";
import { ShapeSwitcher, type ShapeKind } from "./ui/ShapeSwitcher";
import { CutPreview } from "./ui/CutPreview";

import { createCubeGeometry } from "./geometry/CubeGeometry";
import { createSphereGeometry } from "./geometry/SphereGeometry";
import { createTorusGeometry } from "./geometry/TorusGeometry";
import { createCylinderGeometry } from "./geometry/CylinderGeometry";
import type { Geometry } from "./geometry/Geometry";

import { v3 } from "./math/Vec3";

// ----- bootstrap -----------------------------------------------------------

const canvas = document.getElementById("viewport") as HTMLCanvasElement;
const engine = new Engine(canvas);
const scene = new Scene();

scene.camera.target = v3(0, 0.5, 0);
scene.camera.radius = 6.5;
scene.camera.azimuth = Math.PI * 0.18;
scene.camera.polar = Math.PI * 0.38;

// OrbitControls FIRST so its listeners are registered before CutManager's.
const controls = new OrbitControls(canvas, scene.camera);

const cutManager = new CutManager(canvas, engine.gl, scene, scene.camera, controls);

// ----- UI ------------------------------------------------------------------

const title = new TitleScreen();
new ModeHUD(cutManager);
new CutPreview(cutManager);
const switcher = new ShapeSwitcher(cutManager);

switcher.onShape((kind) => loadShape(kind));
switcher.onReset(() => loadShape(switcher.current));

// ----- shape factory -------------------------------------------------------

const SHAPE_BUILDERS: Record<ShapeKind, () => Geometry> = {
  cube: () => createCubeGeometry(1.8),
  sphere: () => createSphereGeometry(1.1, 40, 28),
  torus: () => createTorusGeometry(1.0, 0.4, 56, 22),
  cylinder: () => createCylinderGeometry(0.9, 1.9, 40),
};

const PALETTE = [
  v3(0.43, 0.66, 1.0),
  v3(1.0, 0.62, 0.45),
  v3(0.62, 0.92, 0.7),
  v3(0.95, 0.55, 0.85),
];

const loadShape = (kind: ShapeKind): void => {
  cutManager.clearAll();
  const geom = SHAPE_BUILDERS[kind]();
  const mesh = new Mesh(engine.gl, geom);
  mesh.color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
  mesh.position = v3(0, 1.1, 0);
  cutManager.registerCuttable(mesh, true);
};

// Seed with the default shape so the title-screen backdrop has something
loadShape("cube");
switcher.setActive("cube");

// ----- title -> hand off ---------------------------------------------------

title.onStart(() => {
  // Default to navigate so user can rotate the scene immediately
  cutManager.setMode("navigate");
});

// ----- render loop ---------------------------------------------------------

let lastT = performance.now();
const tick = (now: number): void => {
  const dt = (now - lastT) / 1000;
  lastT = now;

  // Slow auto-rotate of the camera while the title screen is up
  const titleEl = document.getElementById("title-screen");
  if (titleEl && !titleEl.classList.contains("gone")) {
    scene.camera.azimuth += dt * 0.18;
  }

  engine.render(scene);
  requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
