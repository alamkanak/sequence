import { useEffect, useState } from "react";
import { ArrowDownIcon, PlayIcon, ArrowClockwiseIcon } from "./icons";
import { meter, type Metrics } from "../core/performance";
import { benchmarkReport } from "../core/benchmark-report";
import { duration } from "../core/model";
import { loadStressProject } from "../core/benchmark";
import { store } from "../core/store";
import { transport } from "../engine/transport";
import { download } from "../core/storage";
import { Modal, Button, cn, skin } from "./ui";
export function PerformanceDialog({ onClose }: { onClose: () => void }) {
  const [metrics, setMetrics] = useState(meter.snapshot()),
    [running, setRunning] = useState(false),
    [remaining, setRemaining] = useState(0),
    [result, setResult] = useState<Metrics | null>(null);
  useEffect(() => {
    const timer = setInterval(() => setMetrics(meter.snapshot()), 300);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!running) return;
    let seconds = 10;
    setRemaining(seconds);
    const timer = setInterval(() => {
      seconds--;
      setRemaining(seconds);
      if (seconds <= 0) {
        setRunning(false);
        transport.pause();
        setMetrics(meter.snapshot());
        setResult(meter.snapshot());
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [running]);
  const report = () => benchmarkReport(result || metrics);
  const display = result || metrics;
  return (
    <Modal title="Performance lab" onClose={onClose}>
      <div className="space-y-4">
        <p className={cn("text-xs leading-relaxed", skin.muted)}>
          Live measurements from this browser and timeline. Preview cadence and
          UI refresh are measured independently of export speed.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "UI refresh", value: `${display.uiFps.toFixed(1)} FPS` },
            {
              label: "p95 frame interval",
              value: `${display.p95FrameMs.toFixed(1)} ms`,
            },
            {
              label: "Last media render",
              value: `${display.renderMs.toFixed(1)} ms`,
            },
            {
              label: "Handler → next frame p95",
              value: display.inputSamples
                ? `${display.inputP95Ms.toFixed(1)} ms`
                : "No input samples",
            },
            { label: "Long tasks (>50ms)", value: String(display.longTasks) },
            { label: "Rendered frames", value: String(display.renders) },
            { label: "Render backpressure", value: String(display.skipped) },
            {
              label: "Sample window",
              value: `${display.elapsed.toFixed(1)} s`,
            },
          ].map((m) => (
            <div
              key={m.label}
              className={cn("rounded-lg border p-3", skin.border, skin.raised)}
            >
              <p className={cn("text-xs", skin.muted)}>{m.label}</p>
              <p className="mt-1 font-mono text-lg">{m.value}</p>
            </div>
          ))}
        </div>
        <p className={cn("text-xs", skin.muted)}>
          Renderer: {display.renderer} · {display.samples} UI samples ·{" "}
          {display.decoded} decoded frames
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            disabled={running || !store.get().project.clips.length}
            onClick={async () => {
              setResult(null);
              transport.seek(0);
              meter.reset();
              await transport.play();
              setRunning(true);
            }}
          >
            <PlayIcon size={13} />
            {running
              ? `Measuring · ${remaining}s`
              : "Run 10s playback benchmark"}
          </Button>
          <Button
            disabled={running}
            onClick={async () => {
              try {
                await loadStressProject();
                setResult(null);
                meter.reset();
                setMetrics(meter.snapshot());
              } catch (e) {
                store.patch({ error: String(e) });
              }
            }}
          >
            Load 1080p stress project
          </Button>
          <Button
            onClick={() => {
              setResult(null);
              meter.reset();
              setMetrics(meter.snapshot());
            }}
          >
            <ArrowClockwiseIcon size={13} />
            Reset
          </Button>
          <Button
            onClick={() =>
              download(
                new Blob([JSON.stringify(report(), null, 2)], {
                  type: "application/json",
                }),
                "sequence-performance.json",
              )
            }
          >
            <ArrowDownIcon size={13} />
            Report
          </Button>
        </div>
        <p className={cn("text-xs leading-relaxed", skin.muted)}>
          Keep the tab foregrounded. These measurements describe this workload,
          device, and preview quality; they do not establish universal
          performance. The scripted stress benchmark adds 500 segments and real
          media.
        </p>
        <details>
          <summary className="cursor-pointer text-xs">Benchmark JSON</summary>
          <textarea
            aria-label="Benchmark report JSON"
            readOnly
            value={JSON.stringify(report(), null, 2)}
            rows={10}
            className={cn(
              "mt-2 w-full rounded-lg p-2 font-mono text-xs",
              skin.input,
            )}
          />
        </details>
      </div>
    </Modal>
  );
}
