import { meter, type Metrics } from "./performance";
import { store } from "./store";
import { duration } from "./model";
export function benchmarkReport(metrics: Metrics = meter.snapshot()) {
  const p = store.get().project;
  return {
    timestamp: new Date().toISOString(),
    environment: {
      userAgent: navigator.userAgent,
      cores: navigator.hardwareConcurrency,
      dpr: devicePixelRatio,
      viewport: [innerWidth, innerHeight],
      visibility: document.visibilityState,
    },
    project: {
      width: p.width,
      height: p.height,
      fps: p.fps,
      clips: p.clips.length,
      tracks: p.tracks.length,
      duration: duration(p),
    },
    metrics,
    notes: [
      "UI FPS is requestAnimationFrame cadence, not display scanout.",
      "Render backpressure is not a verified media frame-drop count.",
      "Audio drift and cold seek latency require separate end-to-end instrumentation.",
      "Input latency here is handler-to-next-rAF, not physical input-to-display latency.",
    ],
  };
}
