# SliceLab — WebGL Mesh Cutter

A 3D mesh editing tool built from scratch on **raw WebGL2 + TypeScript + Vite**.
Load a primitive, drag a cut across it, and the mesh splits cleanly into two
or more independent pieces — each draggable on its own.

No Three.js, no Babylon.js. No external slicing libraries. Everything (math,
shaders, geometry generation, the cutter, controls) lives in [src/](src/).

## Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints (default <http://localhost:5173>).

## Build

```bash
npm run build       # type-check + production bundle into dist/
npm run preview     # serve the built bundle
```

## Architecture

```
src/
├── main.ts                Composition root — wires engine, scene, controls, cut manager, UI
├── core/
│   ├── Engine.ts          WebGL2 context, frame loop, draw pipeline (objects + grid)
│   ├── Shader.ts          Thin program/uniform/attribute wrapper
│   ├── Mesh.ts            GPU mesh — owns VAO + position/normal buffers + transform
│   ├── Camera.ts          Orbit camera (target / azimuth / polar / radius)
│   ├── Light.ts           Directional + ambient
│   └── Scene.ts           Mesh list + camera + lighting
├── math/                  Pure-TS Vec3 / Mat3 / Mat4 / Plane / Ray utilities
├── geometry/              Procedural triangle-soup generators (cube, sphere, torus, cylinder)
├── shaders/               GLSL ES 3.00 string sources (Phong, infinite grid)
├── controls/
│   ├── OrbitControls.ts   Mouse orbit / pan / zoom
│   └── Raycaster.ts       Screen → world ray + Möller–Trumbore triangle hit
├── cut/
│   ├── MeshCutter.ts      Generic plane-vs-triangle-mesh slicer (+ cap construction)
│   └── CutManager.ts      Central state machine: modes, cut gesture, drag, part registry
└── ui/                    Title screen, mode HUD, shape switcher, cut preview overlay
```

### CutManager

`CutManager` is the **only** class that touches cut state. Scene setup just
hands meshes off via `registerCuttable`; the UI subscribes via
`onModeChange / onCutPreview / onPartCountChange`. There is no slicing logic
in either the UI or `main.ts`.

### MeshCutter

`MeshCutter.cut(geometry, plane)` takes any triangle-soup `Geometry` and any
`Plane`. It returns two new `Geometry` objects (or `null` for the side that
got nothing). The algorithm:

1. **Per triangle** — compute signed distances of vertices to the plane.
   * If all on one side, emit the whole triangle there.
   * Otherwise, walk the edges, split where signs differ (linear interp of
     position + normal), fan-triangulate the resulting convex polygon on
     each side.
2. **Cap construction** — every split contributes one cut-edge on the plane.
   Chain edges into closed loops, fan-triangulate each loop from its
   centroid. Wind correctly so each side's cap faces *outward* from that
   side. Works for both convex meshes (single loop) and meshes like the
   torus (multiple loops).

No shape-specific code.

## Controls

| Mode      | Mouse                                         |
| --------- | --------------------------------------------- |
| Navigate  | LMB orbit · RMB / shift+LMB pan · wheel zoom · LMB on a piece to drag it |
| Cut       | LMB drag across the mesh                      |
| `C`       | Toggle Navigate ↔ Cut                         |
| `Esc`     | Force Navigate                                |

The cutting plane is the plane containing the camera eye and the world-space
rays cast through both ends of the drag. After a cut, the two halves are
nudged apart along the plane normal for visual feedback and re-registered as
independent cuttable parts — so you can keep cutting them too.
