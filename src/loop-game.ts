export class GameLoop {
  private lastTime = 0;
  private accumulator = 0;
  private readonly tickMs: number;
  private rafHandle = 0;
  private _running = false;

  private readonly onTick: () => void;
  private readonly onRender: () => void;

  constructor(
    tickRate: number,         // ticks per second, default 12
    onTick: () => void,       // called each game tick
    onRender: () => void      // called each animation frame
  ) {
    this.tickMs = 1000 / tickRate;
    this.onTick = onTick;
    this.onRender = onRender;
  }

  get running(): boolean {
    return this._running;
  }

  /** Start the loop. No-op if already running. */
  start(): void {
    if (this._running) return;
    this._running = true;
    this.lastTime = 0;
    this.accumulator = 0;
    this.rafHandle = requestAnimationFrame(this.loop);
  }

  /** Stop the loop. No-op if not running. */
  stop(): void {
    if (!this._running) return;
    this._running = false;
    cancelAnimationFrame(this.rafHandle);
    this.rafHandle = 0;
  }

  /**
   * Core RAF callback. Implements a fixed-timestep loop:
   * - Accumulates elapsed time since the last frame.
   * - Drains the accumulator in `tickMs` increments, calling `onTick` each time.
   * - Caps at 5 ticks per frame to prevent a spiral of death on slow frames.
   * - Calls `onRender` once per frame regardless of tick count.
   */
  private loop = (now: number): void => {
    if (!this._running) return;

    // On the very first frame lastTime is 0 — use 0 delta to avoid a large spike.
    if (this.lastTime !== 0) {
      const delta = now - this.lastTime;
      this.accumulator += delta;
    }
    this.lastTime = now;

    // Drain accumulated time, capped at 5 ticks to prevent spiral of death.
    let ticks = 0;
    while (this.accumulator >= this.tickMs && ticks < 5) {
      this.onTick();
      this.accumulator -= this.tickMs;
      ticks++;
    }

    // If we hit the cap, discard leftover time so we don't compound lag.
    if (ticks === 5) {
      this.accumulator = 0;
    }

    this.onRender();

    this.rafHandle = requestAnimationFrame(this.loop);
  };
}
