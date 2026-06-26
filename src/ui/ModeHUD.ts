import type { CutManager, CutMode } from "../cut/CutManager";

/**
 * Mode HUD — top-centre panel that reflects the CutManager's current mode and
 * the live part count.
 */
export class ModeHUD {
  private readonly el = document.getElementById("mode-hud")!;
  private readonly value = document.getElementById("mode-value")!;

  constructor(manager: CutManager) {
    this.update(manager.mode, manager.partCount);
    manager.onModeChange((m) => this.update(m, manager.partCount));
    manager.onPartCountChange((c) => this.update(manager.mode, c));
  }

  private update(mode: CutMode, parts: number): void {
    this.el.classList.toggle("mode-cut", mode === "cut");
    this.el.classList.toggle("mode-navigate", mode === "navigate");
    this.value.textContent =
      mode === "cut" ? `Cut · ${parts} part${parts === 1 ? "" : "s"}` : "Navigate";
  }
}
