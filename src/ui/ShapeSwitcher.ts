import type { CutManager } from "../cut/CutManager";

export type ShapeKind = "cube" | "sphere" | "torus" | "cylinder";

/**
 * Toolbar at the top-left for picking which primitive to spawn and resetting
 * the scene. The active shape is highlighted.
 */
export class ShapeSwitcher {
  private readonly buttons: HTMLButtonElement[];
  private readonly resetBtn: HTMLButtonElement;
  private active: ShapeKind = "cube";
  private shapeCb: (kind: ShapeKind) => void = () => {};
  private resetCb: () => void = () => {};

  constructor(_manager: CutManager) {
    const root = document.getElementById("shape-switcher")!;
    this.buttons = Array.from(
      root.querySelectorAll("button[data-shape]"),
    ) as HTMLButtonElement[];
    this.resetBtn = document.getElementById("reset-btn") as HTMLButtonElement;

    for (const b of this.buttons) {
      b.addEventListener("click", () => {
        const kind = b.dataset.shape as ShapeKind;
        this.setActive(kind);
        this.shapeCb(kind);
      });
    }
    this.resetBtn.addEventListener("click", () => {
      this.resetCb();
    });
  }

  onShape(cb: (kind: ShapeKind) => void): void {
    this.shapeCb = cb;
  }

  onReset(cb: () => void): void {
    this.resetCb = cb;
  }

  setActive(kind: ShapeKind): void {
    this.active = kind;
    for (const b of this.buttons) {
      b.classList.toggle("active", b.dataset.shape === kind);
    }
  }

  get current(): ShapeKind {
    return this.active;
  }
}
