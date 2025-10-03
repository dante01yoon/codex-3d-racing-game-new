export type UpdateCallback = (delta: number) => void;

export class Loop {
  private rafId: number | null = null;
  private lastTime = 0;
  private readonly update: UpdateCallback;

  constructor(update: UpdateCallback) {
    this.update = update;
  }

  start() {
    if (this.rafId !== null) {
      return;
    }

    this.lastTime = performance.now();
    const step = (time: number) => {
      const delta = (time - this.lastTime) / 1000;
      this.lastTime = time;

      this.update(delta);
      this.rafId = requestAnimationFrame(step);
    };

    this.rafId = requestAnimationFrame(step);
  }

  stop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
