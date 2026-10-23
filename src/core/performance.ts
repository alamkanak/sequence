export interface Metrics {
  uiFps: number;
  p95FrameMs: number;
  maxFrameMs: number;
  longTasks: number;
  renders: number;
  renderMs: number;
  skipped: number;
  inputP95Ms: number;
  inputSamples: number;
  samples: number;
  elapsed: number;
  renderer: string;
  decoded: number;
  cacheBytes: number;
}
const percentile = (a: number[], p: number) =>
  a.length
    ? [...a].sort((x, y) => x - y)[
        Math.min(a.length - 1, Math.floor(a.length * p))
      ]
    : 0;
class PerformanceMeter {
  frames: number[] = [];
  inputs: number[] = [];
  start = performance.now();
  last = 0;
  running = false;
  longTasks = 0;
  renders = 0;
  renderMs = 0;
  skipped = 0;
  renderer = "Starting";
  decoded = 0;
  cacheBytes = 0;
  observer?: PerformanceObserver;
  constructor() {
    try {
      this.observer = new PerformanceObserver((list) => {
        this.longTasks += list.getEntries().length;
      });
      this.observer.observe({ type: "longtask", buffered: false });
    } catch {
      /* Unsupported by this browser. */
    }
  }
  reset() {
    this.frames = [];
    this.inputs = [];
    this.start = performance.now();
    this.last = 0;
    this.longTasks = 0;
    this.renders = 0;
    this.skipped = 0;
    this.renderMs = 0;
  }
  tick(now: number) {
    if (this.last) {
      const ms = now - this.last;
      if (ms < 1000) {
        this.frames.push(ms);
        if (this.frames.length > 18000) this.frames.shift();
      }
    }
    this.last = now;
  }
  input(start: number) {
    requestAnimationFrame(() => {
      this.inputs.push(performance.now() - start);
      if (this.inputs.length > 2000) this.inputs.shift();
    });
  }
  snapshot(): Metrics {
    const mean = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
    return {
      uiFps: mean ? 1000 / mean : 0,
      p95FrameMs: percentile(this.frames, 0.95),
      maxFrameMs: Math.max(0, ...this.frames),
      longTasks: this.longTasks,
      renders: this.renders,
      renderMs: this.renderMs,
      skipped: this.skipped,
      inputP95Ms: percentile(this.inputs, 0.95),
      inputSamples: this.inputs.length,
      samples: this.frames.length,
      elapsed: (performance.now() - this.start) / 1000,
      renderer: this.renderer,
      decoded: this.decoded,
      cacheBytes: this.cacheBytes,
    };
  }
}
export const meter = new PerformanceMeter();
