import type { CutManager, CutPreview as Preview } from "../cut/CutManager";

/**
 * SVG-line overlay showing the cut path while dragging. Driven entirely by
 * CutManager events — no business logic.
 */
export class CutPreview {
  private readonly overlay = document.getElementById("cut-overlay")!;
  private readonly line = document.getElementById(
    "cut-line",
  ) as unknown as SVGLineElement;

  constructor(manager: CutManager) {
    manager.onCutPreview((p) => this.render(p));
  }

  private render(p: Preview | null): void {
    if (!p) {
      this.overlay.classList.remove("active");
      return;
    }
    this.overlay.classList.add("active");
    this.line.setAttribute("x1", String(p.startX));
    this.line.setAttribute("y1", String(p.startY));
    this.line.setAttribute("x2", String(p.endX));
    this.line.setAttribute("y2", String(p.endY));
  }
}
