import { useState } from "react";
import {
  ArrowDownIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  WarningCircleIcon,
} from "./icons";
import { useStore } from "../core/store";
import { exports, useExport } from "../engine/export";
import { transport } from "../engine/transport";
import { duration } from "../core/model";
import { Modal, Field, Input, Button, cn, skin } from "./ui";
import { Select } from "./Select";
export function ExportDialog({ onClose }: { onClose: () => void }) {
  const { project: p } = useStore(),
    job = useExport();
  const [name, setName] = useState(p.name),
    [width, setWidth] = useState(Math.round(p.width / 2) * 2),
    [height, setHeight] = useState(Math.round(p.height / 2) * 2),
    [fps, setFps] = useState(p.fps),
    [bitrate, setBitrate] = useState(8),
    [format, setFormat] = useState<"mp4" | "webm">("mp4"),
    [audio, setAudio] = useState(true),
    [toneMap, setToneMap] = useState(false);
  const hdr = p.assets.some((a) => a.hdr);
  const active = job.status === "rendering";
  return (
    <Modal
      title={
        job.status === "complete"
          ? "Your story, ready to share."
          : "Export your video"
      }
      onClose={onClose}
      wide={job.status === "complete"}
    >
      {job.status === "complete" ? (
        <div className="space-y-4">
          <video
            aria-label="Exported video preview"
            data-testid="exported-video"
            src={job.url}
            controls
            className="max-h-[52dvh] w-full rounded-lg bg-black"
          />
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircleIcon size={18} className="text-emerald-400" />
                {job.settings?.name}.{job.settings?.format}
              </div>
              <p className={cn("mt-1 text-xs", skin.muted)}>
                {((job.blob?.size || 0) / 1024 / 1024).toFixed(2)} MB ·{" "}
                {job.frames} frames · {job.seconds?.toFixed(1)}s render ·{" "}
                {job.fps.toFixed(1)} export FPS · {job.renderer}
              </p>
            </div>
            <a
              href={job.url}
              download={`${job.settings?.name || "sequence"}.${job.settings?.format || "mp4"}`}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-xs font-medium text-white hover:bg-indigo-400"
            >
              <ArrowDownIcon size={15} />
              Download video
            </a>
          </div>
          <Button variant="ghost" onClick={() => exports.reset()}>
            Export another version <ArrowRightIcon size={13} />
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <p className={cn("text-xs leading-relaxed", skin.muted)}>
            Rendered on your device, from the original media.
            <br />
            {duration(p).toFixed(2)} seconds · {p.clips.length} segments · SDR
            output
          </p>
          <Field label="File name">
            <Input
              aria-label="Export file name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={active}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Format"
              disabled={active}
              value={format}
              onChange={(v) => setFormat(v as "mp4" | "webm")}
              options={[
                { value: "mp4", label: "MP4 · H.264 + AAC" },
                { value: "webm", label: "WebM · VP9 + Opus" },
              ]}
            />
            <Select
              label="Resolution"
              disabled={active}
              value={`${width}x${height}`}
              onChange={(v) => {
                const [w, h] = v.split("x").map(Number);
                setWidth(w);
                setHeight(h);
              }}
              options={[
                {
                  value: `${Math.round(p.width / 2) * 2}x${Math.round(p.height / 2) * 2}`,
                  label: `Project · ${Math.round(p.width / 2) * 2} × ${Math.round(p.height / 2) * 2}`,
                },
                ...[1920, 1280, 960, 640]
                  .filter((w) => w !== Math.round(p.width / 2) * 2)
                  .map((w) => ({
                    value: `${w}x${Math.round(((w / p.width) * p.height) / 2) * 2}`,
                    label: `${w} × ${Math.round(((w / p.width) * p.height) / 2) * 2}`,
                  })),
              ]}
            />
            <Field label="Frames per second">
              <Input
                aria-label="Export FPS"
                type="number"
                min={1}
                max={120}
                step={0.001}
                value={fps}
                onChange={(e) => setFps(+e.target.value)}
                disabled={active}
              />
            </Field>
            <Select
              label="Quality"
              disabled={active}
              value={bitrate}
              onChange={(v) => setBitrate(+v)}
              options={[
                { value: 3, label: "Compact · 3 Mbps" },
                { value: 8, label: "High · 8 Mbps" },
                { value: 16, label: "Very high · 16 Mbps" },
                { value: 32, label: "Maximum · 32 Mbps" },
              ]}
            />
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={audio}
              onChange={(e) => setAudio(e.target.checked)}
              className="accent-indigo-400"
              disabled={active}
            />
            Include audio
          </label>
          {hdr && (
            <label className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-500">
              <input
                type="checkbox"
                checked={toneMap}
                onChange={(e) => setToneMap(e.target.checked)}
                className="mt-0.5 accent-indigo-400"
              />
              Convert HDR sources to SDR. This version does not preserve HDR
              metadata or 10-bit output.
            </label>
          )}
          {active && (
            <div
              aria-live="polite"
              className={cn("rounded-lg border p-4", skin.border)}
            >
              <progress
                aria-label="Export progress"
                max={1}
                value={job.progress}
                className="h-1.5 w-full accent-indigo-400"
              />
              <div className="mt-2 flex justify-between text-xs">
                <span>Rendering… {Math.round(job.progress * 100)}%</span>
                <span className={skin.muted}>{job.fps.toFixed(1)} FPS</span>
              </div>
            </div>
          )}
          {job.error && (
            <p
              role="alert"
              className="flex items-center gap-2 text-xs text-red-400"
            >
              <WarningCircleIcon size={17} />
              {job.error}
            </p>
          )}
          <div
            className={cn("flex justify-end gap-2 border-t pt-4", skin.border)}
          >
            {active ? (
              <Button variant="danger" onClick={() => exports.cancel()}>
                Cancel rendering
              </Button>
            ) : (
              <>
                <Button onClick={onClose}>Back to editing</Button>
                <Button
                  variant="primary"
                  disabled={
                    !p.clips.length ||
                    !name.trim() ||
                    fps < 1 ||
                    fps > 120 ||
                    (hdr && !toneMap)
                  }
                  onClick={() => {
                    transport.pause();
                    exports.start(p, {
                      name: name.replace(/[\\/:*?"<>|]/g, "-"),
                      width,
                      height,
                      fps,
                      bitrate: bitrate * 1e6,
                      format,
                      audio,
                      allowToneMap: toneMap,
                    });
                  }}
                >
                  Export video <ArrowRightIcon size={14} />
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
