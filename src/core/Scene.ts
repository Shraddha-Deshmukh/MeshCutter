/**
 * Scene = list of meshes + lights + camera. The Engine knows how to render it.
 * Cut parts are added/removed dynamically by the CutManager.
 */

import type { Mesh } from "./Mesh";
import { Lighting } from "./Light";
import { Camera } from "./Camera";

export class Scene {
  readonly meshes: Mesh[] = [];
  readonly lighting = new Lighting();
  readonly camera = new Camera();

  add(mesh: Mesh): void {
    this.meshes.push(mesh);
  }

  remove(mesh: Mesh): void {
    const i = this.meshes.indexOf(mesh);
    if (i >= 0) {
      this.meshes.splice(i, 1);
      mesh.dispose();
    }
  }

  clear(): void {
    for (const m of this.meshes) m.dispose();
    this.meshes.length = 0;
  }
}
