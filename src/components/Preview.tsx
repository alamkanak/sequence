import { useEffect, useRef, useState } from "react";
import {
  PlayIcon,
  PauseIcon,
  SkipBackIcon,
  SkipForwardIcon,
  CornersOutIcon,
  CrosshairIcon,
} from "./icons";
import { useStore, store } from "../core/store";
import { transport } from "../engine/transport";
import { PreviewEngine } from "../engine/client";
import { pose, corners, type Pose } from "../engine/scene";
import {
  resizeHandles,
  resizeCursor,
  resizeClip,
  rotationHandle,
  type ResizeHandle,
} from "../engine/transform";
import { setCanvasCursor, type CanvasCursor } from "./canvas-cursor";
import { snapResize } from "../engine/resize-alignment";
import { snapAlignment, type AlignmentGuide } from "../engine/alignment";
import { duration, type Clip } from "../core/model";
import { meter } from "../core/performance";
import { cn, skin, IconButton, timecode } from "./ui";
import { Select } from "./Select";
import { editor } from "./editor-ui";
export function TransportControls() {
  const { project } = useStore();
  const [playing, setPlaying] = useState(transport.playing);
  const current = useRef<HTMLSpanElement>(null);
  useEffect(
    () =>
      transport.subscribe(() => {
        if (current.current)
          current.current.textContent = timecode(transport.time, project.fps);
        setPlaying(transport.playing);
      }),
    [project.fps],
  );
  return (
    <div
      className={cn(
        "grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-t px-3",
        skin.border,
        skin.panel,
      )}
    >
      <div
        className={cn("flex items-center gap-1 font-mono text-xs", skin.muted)}
      >
        <span
          ref={current}
          className="text-indigo-600 [[data-theme=dark]_&]:text-indigo-300"
        >
          {timecode(transport.time, project.fps)}
        </span>
        <span className="hidden @[480px]:inline">/</span>
        <span className="hidden @[480px]:inline">
          {timecode(duration(project), project.fps)}
        </span>
      </div>
      <div className={cn("flex items-center gap-1", skin.muted)}>
        <IconButton
          size="sm"
          label="Go to start"
          onClick={() => transport.seek(0)}
        >
          <SkipBackIcon size={18} weight="fill" />
        </IconButton>
        <IconButton
          label={playing ? "Pause" : "Play"}
          size="sm"
          onClick={() => void transport.play()}
          className={editor.active}
        >
          {playing ? (
            <PauseIcon size={18} weight="fill" />
          ) : (
            <PlayIcon size={18} weight="fill" />
          )}
        </IconButton>
        <IconButton
          label="Go to end"
          size="sm"
          onClick={() => transport.seek(duration(project) - 1 / project.fps)}
        >
          <SkipForwardIcon size={18} weight="fill" />
        </IconButton>
      </div>
      <div
        className={cn(
          "hidden items-center justify-end gap-2 text-xs @[640px]:flex",
          skin.muted,
        )}
      >
        <kbd
          className={cn("rounded border px-1.5 py-0.5 font-sans", skin.border)}
        >
          Space
        </kbd>{" "}
        Play / pause
      </div>
    </div>
  );
}
export function Preview() {
  const { project, selected } = useStore();
  const scene = useRef<HTMLDivElement>(null),
    overlay = useRef<HTMLCanvasElement>(null),
    host = useRef<HTMLDivElement>(null),
    engine = useRef<PreviewEngine | undefined>(undefined),
    latest = useRef({ project, selected });
  latest.current = { project, selected };
  const [quality, setQuality] = useState(1);
  const [loading, setLoading] = useState(true);
  const gesture = useRef<
    | {
        mode: "move" | "resize" | "rotate" | "pivot";
        clip: Clip;
        x: number;
        y: number;
        patch: Partial<Clip>;
        initial: Pose;
        handle?: ResizeHandle;
      }
    | undefined
  >(undefined);
  const dirty = useRef(true),
    gestureFrame = useRef(0);
  const guides = useRef<AlignmentGuide[]>([]);
  const centerModifier = useRef(false);
  useEffect(() => {
    const update = (e: KeyboardEvent) => {
      centerModifier.current = e.altKey;
    };
    const clear = () => {
      centerModifier.current = false;
    };
    window.addEventListener("keydown", update);
    window.addEventListener("keyup", update);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", update);
      window.removeEventListener("keyup", update);
      window.removeEventListener("blur", clear);
    };
  }, []);
  const view = () => {
    const r = host.current!.getBoundingClientRect();
    const { project: p } = latest.current;
    const fit = Math.min(r.width / p.width, r.height / p.height);
    return {
      left: (r.width - p.width * fit) / 2,
      top: (r.height - p.height * fit) / 2,
      fit,
      w: r.width,
      h: r.height,
    };
  };
  useEffect(() => {
    const surface = document.createElement("canvas");
    surface.width = 960;
    surface.height = 540;
    surface.className = "size-full object-contain";
    scene.current!.appendChild(surface);
    const e = new PreviewEngine(surface);
    let active = true;
    engine.current = e;
    transport.engine = e;
    e.setProject(latest.current.project)
      .then(() => (active ? e.draw(transport.time, true) : undefined))
      .then(() => {
        if (active) setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        store.patch({ error: err.message });
        setLoading(false);
      });
    e.client.onProgress = (m) => {
      if (active && m.type === "gpu-lost")
        store.patch({
          error:
            "Graphics device lost. Reload the project to restart the renderer.",
        });
    };
    const ro = new ResizeObserver(() => {
      dirty.current = true;
    });
    ro.observe(host.current!);
    return () => {
      active = false;
      ro.disconnect();
      e.dispose();
      surface.remove();
      if (transport.engine === e) transport.engine = undefined;
    };
  }, []);
  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    let active = true;
    transport.pause();
    e.setProject(project)
      .then(() =>
        active
          ? e.resize(
              Math.min(1280, project.width) * quality,
              Math.round(
                ((Math.min(1280, project.width) * quality) / project.width) *
                  project.height,
              ),
            )
          : undefined,
      )
      .then(() => (active ? e.draw(transport.time, true) : undefined))
      .catch((err) => {
        if (active) store.patch({ error: err.message });
      });
    dirty.current = true;
    return () => {
      active = false;
    };
  }, [project, quality]);
  useEffect(() => {
    dirty.current = true;
  }, [selected]);
  useEffect(() => {
    const c = overlay.current!,
      ctx = c.getContext("2d")!;
    let raf = 0,
      last = -1;
    const unsub = transport.subscribe(() => {
      if (transport.time !== last) {
        dirty.current = true;
        last = transport.time;
      }
    });
    const loop = () => {
      if (dirty.current) {
        dirty.current = false;
        const v = view();
        if (
          c.width !== v.w * devicePixelRatio ||
          c.height !== v.h * devicePixelRatio
        ) {
          c.width = v.w * devicePixelRatio;
          c.height = v.h * devicePixelRatio;
        }
        ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
        ctx.clearRect(0, 0, v.w, v.h);
        const p = latest.current.project;
        const stageW = p.width * v.fit,
          stageH = p.height * v.fit;
        ctx.strokeStyle =
          document.documentElement.dataset.theme === "dark"
            ? "#71717a"
            : "#a1a1aa";
        ctx.lineWidth = 1;
        ctx.strokeRect(
          v.left + 0.5,
          v.top + 0.5,
          Math.max(0, stageW - 1),
          Math.max(0, stageH - 1),
        );
        const source = p.clips.find((c) => c.id === latest.current.selected);
        if (
          source &&
          source.kind !== "audio" &&
          transport.time >= source.start &&
          transport.time < source.start + source.duration
        ) {
          const clip = { ...source, ...gesture.current?.patch };
          const pp = pose(clip, p, transport.time),
            pts = corners(pp).map((q) => ({
              x: v.left + q.x * v.fit,
              y: v.top + q.y * v.fit,
            }));
          ctx.strokeStyle = "#aaa2ff";
          ctx.lineWidth = 1;
          ctx.beginPath();
          pts.forEach((q, i) =>
            i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y),
          );
          ctx.closePath();
          ctx.stroke();
          for (const handle of resizeHandles(pp)) {
            const pt = {
              x: v.left + handle.x * v.fit,
              y: v.top + handle.y * v.fit,
            };
            ctx.fillStyle = "#e8e4ff";
            ctx.strokeStyle = "#7065ce";
            ctx.fillRect(pt.x - 4, pt.y - 4, 8, 8);
            ctx.strokeRect(pt.x - 4, pt.y - 4, 8, 8);
          }
          const top = {
            x: (pts[0].x + pts[1].x) / 2,
            y: (pts[0].y + pts[1].y) / 2,
          };
          const rotation = rotationHandle(pp, 24 / v.fit);
          const rotationPoint = {
            x: v.left + rotation.x * v.fit,
            y: v.top + rotation.y * v.fit,
          };
          ctx.strokeStyle = "#aaa2ff";
          ctx.beginPath();
          ctx.moveTo(top.x, top.y);
          ctx.lineTo(rotationPoint.x, rotationPoint.y);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(rotationPoint.x, rotationPoint.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = "#e8e4ff";
          ctx.fill();
          const pivot = { x: v.left + pp.x * v.fit, y: v.top + pp.y * v.fit };
          ctx.beginPath();
          ctx.arc(pivot.x, pivot.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = "#a5b4fc";
          ctx.fill();
        }
        if (guides.current.length) {
          ctx.strokeStyle = "#f472b6";
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 3]);
          for (const guide of guides.current) {
            ctx.beginPath();
            if (guide.axis === "x") {
              const x = v.left + guide.value * v.fit;
              ctx.moveTo(x, v.top);
              ctx.lineTo(x, v.top + stageH);
            } else {
              const y = v.top + guide.value * v.fit;
              ctx.moveTo(v.left, y);
              ctx.lineTo(v.left + stageW, y);
            }
            ctx.stroke();
          }
          ctx.setLineDash([]);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const observer = new MutationObserver(() => (dirty.current = true));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => {
      cancelAnimationFrame(raf);
      unsub();
      observer.disconnect();
    };
  }, []);
  const coords = (e: { clientX: number; clientY: number }) => {
    const r = host.current!.getBoundingClientRect(),
      v = view();
    return {
      x: (e.clientX - r.left - v.left) / v.fit,
      y: (e.clientY - r.top - v.top) / v.fit,
      v,
    };
  };
  const targetAt = (q: ReturnType<typeof coords>) => {
    const p = latest.current.project;
    const source = p.clips.find((c) => c.id === selected);
    let mode: "move" | "resize" | "rotate" | "pivot" = "move";
    let chosen: Clip | undefined;
    let handle: ResizeHandle | undefined;
    if (
      source &&
      source.kind !== "audio" &&
      transport.time >= source.start &&
      transport.time < source.start + source.duration &&
      !p.tracks.find((t) => t.id === source.trackId)?.hidden
    ) {
      const pp = pose(source, p, transport.time),
        threshold = 10 / q.v.fit;
      const top = rotationHandle(pp, 24 / q.v.fit);
      handle = resizeHandles(pp)
        .sort(
          (a, b) =>
            Math.hypot(q.x - a.x, q.y - a.y) - Math.hypot(q.x - b.x, q.y - b.y),
        )
        .find((pt) => Math.hypot(q.x - pt.x, q.y - pt.y) < threshold);
      if (Math.hypot(q.x - top.x, q.y - top.y) < threshold) {
        mode = "rotate";
        chosen = source;
      } else if (handle) {
        mode = "resize";
        chosen = source;
      } else if (Math.hypot(q.x - pp.x, q.y - pp.y) < threshold) {
        mode = "pivot";
        chosen = source;
      }
    }
    if (!chosen) {
      chosen = p.tracks
        .flatMap((tr) =>
          p.clips
            .filter(
              (c) =>
                c.trackId === tr.id &&
                !tr.hidden &&
                c.kind !== "audio" &&
                transport.time >= c.start &&
                transport.time < c.start + c.duration,
            )
            .reverse(),
        )
        .find((c) => {
          const pp = pose(c, p, transport.time),
            dx = q.x - pp.x,
            dy = q.y - pp.y,
            x = dx * Math.cos(-pp.angle) - dy * Math.sin(-pp.angle),
            y = dx * Math.sin(-pp.angle) + dy * Math.cos(-pp.angle);
          return (
            x >= -pp.anchorX * pp.w &&
            x <= (1 - pp.anchorX) * pp.w &&
            y >= -pp.anchorY * pp.h &&
            y <= (1 - pp.anchorY) * pp.h
          );
        });
      mode = "move";
    }
    return chosen ? { clip: chosen, mode, handle } : undefined;
  };
  const cursorFor = (target: ReturnType<typeof targetAt>): CanvasCursor => {
    if (!target) return "default";
    if (project.tracks.find((t) => t.id === target.clip.trackId)?.locked)
      return "notAllowed";
    if (target.mode === "resize")
      return resizeCursor(
        target.handle!,
        pose(target.clip, project, transport.time).angle,
      );
    if (target.mode === "pivot") return "crosshair";
    return target.mode === "rotate" ? "grab" : "move";
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.focus({ preventScroll: true });
    const q = coords(e),
      target = targetAt(q),
      chosen = target?.clip;
    if (!chosen) {
      store.patch({ selected: null });
      return;
    }
    store.patch({ selected: chosen.id });
    if (project.tracks.find((t) => t.id === chosen.trackId)?.locked) return;
    transport.pause();
    gesture.current = {
      mode: target.mode,
      clip: structuredClone(chosen),
      x: q.x,
      y: q.y,
      patch: {},
      initial: pose(chosen, project, transport.time),
      handle: target.handle,
    };
    setCanvasCursor(
      e.currentTarget,
      target.mode === "rotate" ? "grabbing" : cursorFor(target),
    );
    e.currentTarget.setPointerCapture(e.pointerId);
    dirty.current = true;
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = gesture.current;
    if (!g) {
      setCanvasCursor(e.currentTarget, cursorFor(targetAt(coords(e))));
      return;
    }
    const started = performance.now(),
      q = coords(e),
      c = g.clip,
      dx = q.x - g.x,
      dy = q.y - g.y;
    let patch: Partial<Clip> = {};
    guides.current = [];
    if (g.mode === "move") {
      patch = { x: c.x + dx / project.width, y: c.y + dy / project.height };
      if (!e.altKey) {
        const alignment = snapAlignment(
          pose({ ...c, ...patch }, project, transport.time),
          project,
          6 / q.v.fit,
        );
        patch.x! += alignment.dx / project.width;
        patch.y! += alignment.dy / project.height;
        guides.current = alignment.guides;
      }
    }
    if (g.mode === "resize") {
      const fromCenter = e.altKey || centerModifier.current;
      if (e.metaKey || e.ctrlKey) {
        patch = resizeClip(
          c,
          project,
          g.initial,
          g.handle!,
          dx,
          dy,
          !e.shiftKey,
          fromCenter,
        );
      } else {
        const result = snapResize(
          c,
          project,
          g.initial,
          g.handle!,
          dx,
          dy,
          !e.shiftKey,
          fromCenter,
          6 / q.v.fit,
        );
        patch = result.patch;
        guides.current = result.guides;
      }
    }
    if (g.mode === "rotate")
      patch = {
        rotation:
          c.rotation +
          ((Math.atan2(q.y - c.y * project.height, q.x - c.x * project.width) -
            Math.atan2(g.y - c.y * project.height, g.x - c.x * project.width)) *
            180) /
            Math.PI,
      };
    if (g.mode === "pivot") {
      const angle = (c.rotation * Math.PI) / 180,
        rx = dx * Math.cos(-angle) - dy * Math.sin(-angle),
        ry = dx * Math.sin(-angle) + dy * Math.cos(-angle);
      patch = {
        anchorX: c.anchorX + rx / (c.width * project.width * c.scale),
        anchorY: c.anchorY + ry / (c.height * project.height * c.scale),
        x: c.x + dx / project.width,
        y: c.y + dy / project.height,
      };
    }
    g.patch = patch;
    dirty.current = true;
    if (!gestureFrame.current)
      gestureFrame.current = requestAnimationFrame(() => {
        gestureFrame.current = 0;
        const current = gesture.current;
        if (!current) return;
        const p = latest.current.project;
        const transient = {
          ...p,
          clips: p.clips.map((item) =>
            item.id === current.clip.id ? { ...item, ...current.patch } : item,
          ),
        };
        void engine.current
          ?.setProject(transient)
          .then(() => engine.current?.draw(transport.time, true));
      });
    meter.input(started);
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    cancelAnimationFrame(gestureFrame.current);
    gestureFrame.current = 0;
    const g = gesture.current;
    gesture.current = undefined;
    guides.current = [];
    if (g && Object.keys(g.patch).length)
      store.safe(() =>
        store.apply([{ op: "update_clip", id: g.clip.id, patch: g.patch }]),
      );
    dirty.current = true;
    setCanvasCursor(e.currentTarget, cursorFor(targetAt(coords(e))));
  };
  return (
    <div className="@container flex min-h-0 min-w-80 flex-1 flex-col">
      <div
        className={cn(
          editor.panelHeader,
          "justify-between",
          skin.border,
          skin.panel,
        )}
      >
        <span className="hidden @[440px]:inline">Preview</span>
        <div className={cn("ml-auto flex items-center gap-2", skin.muted)}>
          <Select
            label="Preview quality"
            hideLabel
            variant="toolbar"
            value={quality}
            onChange={(value) => setQuality(+value)}
            options={[
              { value: 1, label: "Full quality" },
              { value: 0.5, label: "Half quality" },
              { value: 0.25, label: "Quarter quality" },
            ]}
            className="w-36"
          />
          <span className={cn("whitespace-nowrap", skin.muted)}>
            {project.width} × {project.height}
          </span>
          <IconButton
            label="Fullscreen preview"
            size="sm"
            onClick={() => host.current?.requestFullscreen()}
          >
            <CornersOutIcon size={16} />
          </IconButton>
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-zinc-100 p-6 [[data-theme=dark]_&]:bg-[#18181d]">
        <div ref={host} className="relative size-full">
          <div
            ref={scene}
            role="img"
            aria-label="Video preview"
            data-testid="preview-canvas"
            className="absolute inset-0 size-full"
          />
          <canvas
            ref={overlay}
            aria-label="Preview transform handles"
            tabIndex={0}
            className="absolute inset-0 size-full touch-none outline-none"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onPointerLeave={(e) => {
              if (!gesture.current) setCanvasCursor(e.currentTarget, "default");
            }}
          />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400">
              Preparing media engine…
            </div>
          )}
          {!project.clips.length && !loading && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-500">
              <CrosshairIcon size={28} />
              <p className="text-sm font-medium">Start with a clip</p>
              <p className="max-w-52 text-center text-xs leading-relaxed">
                Import media, then add it to your timeline.
              </p>
            </div>
          )}
        </div>
      </div>
      <TransportControls />
    </div>
  );
}
