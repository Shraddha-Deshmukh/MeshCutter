/** Landing screen with a single Start button. Fades the overlay away and
 *  reveals the HUD on click. */
export class TitleScreen {
  constructor(
    private readonly root = document.getElementById("title-screen")!,
    private readonly button = document.getElementById("start-btn")!,
    private readonly hud = document.getElementById("hud")!,
  ) {}

  onStart(cb: () => void): void {
    this.button.addEventListener("click", () => {
      this.root.classList.add("gone");
      this.hud.classList.remove("hidden");
      setTimeout(() => this.root.remove(), 400);
      cb();
    });
  }
}
