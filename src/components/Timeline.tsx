import { useEffect, useRef, useState } from "react";
import {
  PlusIcon,
  SelectionIcon,
  MinusIcon,
  MagnetIcon,
  ScissorsIcon,
  TrashIcon,
  CopyIcon,
  LockSimpleIcon,
  LockSimpleOpenIcon,
  EyeIcon,
  EyeSlashIcon,
  SpeakerHighIcon,
  SpeakerSlashIcon,
  ArrowsDownUpIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "./icons";
import { store, useStore } from "../core/store";
import { duration, snapTime, track, type Clip } from "../core/model";
import { transport } from "../engine/transport";
import { meter } from "../core/performance";
import { addAsset, duplicateClip } from "../core/actions";
import { assetFiles } from "../engine/client";
import { prepareWaveform, subscribeWaveforms } from "../core/waveforms";
import {
  dbToGain,
  formatDb,
  gainToDb,
  normalizeVolumePoints,
  putVolumePoint,
  setClipVolume,
  sourceTime,
  volumeAt,
  duckVolumeRange,
} from "../core/audio-envelope";
import {
  drawTimelineAudio,
  audioVolumeTarget,
  type AudioRange,
} from "./timeline-audio";
import { AudioRangeDialog } from "./AudioRangeDialog";
import { cn, skin, IconButton, Button } from "./ui";
import { setCanvasCursor, type CanvasCursor } from "./canvas-cursor";
import { PanelDivider, usePanelSize } from "./PanelDivider";
import { panelSizeClass } from "./panel-sizes";
import { editor } from "./editor-ui";
const ROW = 64,
  TOP = 26;
type Gesture = {
  mode: "move" | "left" | "right" | "seek" | "range" | "volume" | "keyframe";
  rangeStart?: number;
  rangeEnd?: number;
  keyTime?: number;
  clip?: Clip;
  x: number;
  y: number;
  ghost?: Clip;
};
export function Timeline({
  heightClass = "basis-80",
}: {
  heightClass?: string;
}) {
  const [trackWidth, setTrackWidth] = usePanelSize("tracks", 176, 160, 320);
  const { project: p, selected } = useStore();
  const canvas = useRef<HTMLCanvasElement>(null),
    wrap = useRef<HTMLDivElement>(null),
    labels = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(65),
    [snap, setSnap] = useState(true),
    [ripple, setRipple] = useState(false);
  const [rangeMode, setRangeMode] = useState(false),
    [range, setRange] = useState<AudioRange | null>(null),
    [rangeDialog, setRangeDialog] = useState(false);
  const offset = useRef(0),
    scrollY = useRef(0),
    gesture = useRef<Gesture | undefined>(undefined),
    dirty = useRef(true),
    paint = useRef<() => void>(() => {});
  const incoming = useRef<{ id: string; x: number; y: number } | null>(null);
  const state = useRef({ p, selected, zoom, snap, ripple, range });
  state.current = { p, selected, zoom, snap, ripple, range };
  useEffect(() => {
    dirty.current = true;
  }, [p, selected, zoom, snap, range]);
  useEffect(
    () =>
      subscribeWaveforms(() => {
        dirty.current = true;
      }),
    [],
  );
  useEffect(() => {
    for (const asset of p.assets) {
      const file = assetFiles.get(asset.id);
      if (file) prepareWaveform(asset, file);
    }
  }, [p.assets]);
  useEffect(() => {
    if (
      range &&
      (selected !== range.clipId ||
        !p.clips.some(
          (c) =>
            c.id === range.clipId &&
            !p.tracks.find((t) => t.id === c.trackId)?.locked,
        ))
    ) {
      setRange(null);
      setRangeDialog(false);
    }
  }, [selected, range, p.clips, p.tracks]);
  useEffect(() => {
    const keys = (e: KeyboardEvent) => {
      if (
        document.querySelector('[role="dialog"]') ||
        (e.target as Element).closest("input,textarea,select,[contenteditable]")
      )
        return;
      if (!e.metaKey && !e.ctrlKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        setRangeMode((v) => !v);
      }
      if (e.key === "Escape") {
        setRangeMode(false);
        setRange(null);
      }
    };
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  }, []);
  useEffect(() => {
    const hover = (event: Event) => {
      incoming.current = (event as CustomEvent).detail;
      dirty.current = true;
    };
    const drop = (event: Event) => {
      const d = (event as CustomEvent).detail;
      incoming.current = null;
      dirty.current = true;
      if (!d) return;
      const rect = canvas.current!.getBoundingClientRect();
      if (
        d.x < rect.left ||
        d.x > rect.right ||
        d.y < rect.top + TOP ||
        d.y > rect.bottom
      )
        return;
      const { p, zoom, snap } = state.current;
      const ti = Math.max(
        0,
        Math.min(
          p.tracks.length - 1,
          Math.floor((d.y - rect.top - TOP + scrollY.current) / ROW),
        ),
      );
      let time = Math.max(0, (d.x - rect.left + offset.current) / zoom);
      if (snap) time = snapTime(time, p, "", transport.time, 8 / zoom);
      store.safe(() => addAsset(d.id, p.tracks[ti].id, time));
    };
    window.addEventListener("sequence-media-hover", hover);
    window.addEventListener("sequence-media-drop", drop);
    return () => {
      window.removeEventListener("sequence-media-hover", hover);
      window.removeEventListener("sequence-media-drop", drop);
    };
  }, []);
  useEffect(() => {
    const el = canvas.current!,
      host = wrap.current!;
    let width = 0,
      height = 0,
      raf = 0;
    const ctx = el.getContext("2d")!;
    let fonts = { body: ctx.font, medium: ctx.font, mono: ctx.font };
    const resize = new ResizeObserver(() => {
      width = host.clientWidth;
      height = host.clientHeight;
      el.width = Math.round(width * devicePixelRatio);
      el.height = Math.round(height * devicePixelRatio);
      // Canvas labels share the Tailwind text-xs scale used by the controls.
      const type = getComputedStyle(el);
      fonts = {
        body: `${type.fontSize} ${type.fontFamily}`,
        medium: `500 ${type.fontSize} ${type.fontFamily}`,
        mono: `${type.fontSize} ${type.getPropertyValue("--font-mono") || "monospace"}`,
      };
      dirty.current = true;
    });
    resize.observe(host);
    let lastTime = -1;
    const draw = () => {
      const { p, selected, zoom } = state.current;
      // Seeking changes time while playback is paused, including pointer-held scrubs.
      if (transport.time !== lastTime) dirty.current = true;
      lastTime = transport.time;
      if (!dirty.current) return;
      dirty.current = false;
      const dark = document.documentElement.dataset.theme === "dark";
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = dark ? "#101013" : "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.font = fonts.mono;
      ctx.textBaseline = "middle";
      const step = zoom < 25 ? 5 : zoom < 55 ? 2 : 1;
      const first = Math.floor(offset.current / zoom / step) * step;
      for (
        let t = first;
        t < (offset.current + width) / zoom + step;
        t += step
      ) {
        const x = t * zoom - offset.current;
        ctx.strokeStyle = dark ? "#202026" : "#eeeef1";
        ctx.beginPath();
        ctx.moveTo(x, TOP);
        ctx.lineTo(x, height);
        ctx.stroke();
        ctx.fillStyle = dark ? "#777782" : "#777782";
        ctx.fillText(
          `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`,
          x + 5,
          13,
        );
      }
      const ghost = gesture.current?.ghost;
      const displayClips = ghost
        ? p.clips.map((c) => (c.id === ghost.id ? ghost : c))
        : p.clips;
      for (let ti = 0; ti < p.tracks.length; ti++) {
        const y = TOP + ti * ROW - scrollY.current;
        if (y > height || y + ROW < TOP) continue;
        ctx.fillStyle =
          ti % 2
            ? dark
              ? "#121216"
              : "#fafafa"
            : dark
              ? "#0e0e12"
              : "#f7f7fa";
        ctx.fillRect(0, y, width, ROW);
        ctx.strokeStyle = dark ? "#25252b" : "#e8e8ee";
        ctx.beginPath();
        ctx.moveTo(0, y + ROW);
        ctx.lineTo(width, y + ROW);
        ctx.stroke();
        const tr = p.tracks[ti];
        const clips = displayClips.filter((c) => c.trackId === tr.id);
        for (const c of clips) {
          const x = c.start * zoom - offset.current,
            w = c.duration * zoom;
          if (x > width || x + w < 0) continue;
          const audio = c.kind === "audio";
          const element = ["text", "shape", "vector"].includes(c.kind);
          ctx.globalAlpha = tr.hidden ? 0.4 : 1;
          ctx.fillStyle = audio
            ? dark
              ? "#16483d"
              : "#c3e6d8"
            : element
              ? dark
                ? "#393252"
                : "#e2dcef"
              : dark
                ? "#323950"
                : "#d7dfef";
          ctx.beginPath();
          ctx.roundRect(x, y + 7, w, 50, 5);
          ctx.fill();
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(x + 1, y + 8, Math.max(0, w - 2), 48, 4);
          ctx.clip();
          const a = p.assets.find((a) => a.id === c.assetId);
          if (a?.hasAudio) {
            const g = gesture.current;
            const activeRange =
              g?.mode === "range" && g.clip
                ? {
                    clipId: g.clip.id,
                    start: Math.min(g.rangeStart!, g.rangeEnd!),
                    end: Math.max(g.rangeStart!, g.rangeEnd!),
                  }
                : state.current.range;
            ctx.font = fonts.body;
            drawTimelineAudio(
              ctx,
              c,
              y,
              x,
              w,
              width,
              zoom,
              c.id === selected,
              activeRange,
            );
          }
          ctx.fillStyle = audio ? "#b7e4d2" : element ? "#e1d8ff" : "#dfe5ff";
          if (!dark)
            ctx.fillStyle = audio ? "#216453" : element ? "#53406c" : "#384964";
          ctx.font = fonts.medium;
          ctx.fillText(c.name, x + 9, y + 22);
          if (c.speed !== 1) {
            ctx.font = fonts.body;
            ctx.fillText(`${c.speed}×`, x + 9, y + 42);
          }
          if (
            gesture.current?.ghost?.id === c.id &&
            ["volume", "keyframe"].includes(gesture.current.mode)
          ) {
            ctx.font = fonts.body;
            ctx.fillText(
              formatDb(
                volumeAt(
                  c,
                  sourceTime(
                    c,
                    (gesture.current.mode === "keyframe"
                      ? gesture.current.rangeEnd
                      : gesture.current.rangeStart) || 0,
                  ),
                ),
              ),
              x + Math.max(9, Math.min(w - 76, width - x - 76)),
              y + 22,
            );
          }
          if (c.fadeIn && !a?.hasAudio) {
            ctx.fillStyle = "#a5b4fc40";
            ctx.beginPath();
            ctx.moveTo(x, y + 57);
            ctx.lineTo(x + c.fadeIn * zoom, y + 7);
            ctx.lineTo(x, y + 7);
            ctx.fill();
          }
          ctx.restore();
          if (c.id === selected) {
            ctx.strokeStyle = "#a5a0ff";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(x, y + 7, w, 50, 5);
            ctx.stroke();
            ctx.fillStyle = "#c9c5ff";
            ctx.fillRect(x + 5, y + 22, 3, 20);
            ctx.fillRect(x + w - 8, y + 22, 3, 20);
            ctx.lineWidth = 1;
          }
          if (c.id === ghost?.id && gesture.current?.mode === "move") {
            ctx.strokeStyle = "#a5b4fc";
            ctx.setLineDash([4, 3]);
            ctx.strokeRect(x, y + 7, w, 50);
            ctx.setLineDash([]);
          }
          ctx.globalAlpha = 1;
        }
      }
      const inc = incoming.current;
      if (inc) {
        const rect = el.getBoundingClientRect();
        const x = inc.x - rect.left,
          y = inc.y - rect.top;
        if (x >= 0 && x <= width && y > TOP && y < height) {
          const asset = p.assets.find((a) => a.id === inc.id);
          const row = Math.floor((y - TOP + scrollY.current) / ROW);
          ctx.fillStyle = "#a5b4fc40";
          ctx.strokeStyle = "#a5b4fc";
          ctx.setLineDash([4, 3]);
          const boxY = TOP + row * ROW - scrollY.current + 7;
          ctx.fillRect(x, boxY, (asset?.duration || 4) * zoom, 50);
          ctx.strokeRect(x, boxY, (asset?.duration || 4) * zoom, 50);
          ctx.setLineDash([]);
        }
      }
      const ph = transport.time * zoom - offset.current;
      if (ph >= 0 && ph <= width) {
        ctx.strokeStyle = "#bcb5ff";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ph, 0);
        ctx.lineTo(ph, height);
        ctx.stroke();
        ctx.fillStyle = "#bcb5ff";
        ctx.beginPath();
        ctx.roundRect(ph - 5, 2, 10, 14, 2);
        ctx.fill();
      }
      ctx.fillStyle = dark ? "#17171c" : "#f3f3f6";
      ctx.fillRect(0, TOP - 1, width, 1);
    };
    paint.current = () => {
      dirty.current = true;
      draw();
    };
    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const observer = new MutationObserver(() => {
      dirty.current = true;
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => {
      resize.disconnect();
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);
  const pos = (e: { clientX: number; clientY: number }) => {
    const rect = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const targetAt = (point: { x: number; y: number }) => {
    const { p, zoom } = state.current;
    const ti = Math.floor((point.y - TOP + scrollY.current) / ROW);
    const t = (point.x + offset.current) / zoom;
    const c = [...p.clips]
      .reverse()
      .find(
        (c) =>
          c.trackId === p.tracks[ti]?.id &&
          t >= c.start &&
          t <= c.start + c.duration,
      );
    if (point.y < TOP || !c) {
      return {
        mode: "seek" as const,
        cursor: (point.y < TOP ? "col" : "crosshair") as CanvasCursor,
      };
    }
    const x = c.start * zoom - offset.current,
      w = c.duration * zoom;
    const edge = Math.min(10, w / 3);
    const mode =
      Math.abs(point.x - x) < edge
        ? ("left" as const)
        : Math.abs(point.x - x - w) < edge
          ? ("right" as const)
          : ("move" as const);
    const locked = p.tracks[ti].locked;
    const hasAudio = p.assets.some((a) => a.id === c.assetId && a.hasAudio);
    const local = t - c.start;
    const top = TOP + ti * ROW - scrollY.current;
    const volume =
      hasAudio && mode === "move"
        ? audioVolumeTarget(c, local, point.y, top, zoom)
        : null;
    const nextMode: Exclude<Gesture["mode"], "seek" | "range"> = volume
      ? volume.time === undefined
        ? "volume"
        : "keyframe"
      : mode;
    return {
      mode: nextMode,
      clip: c,
      locked,
      hasAudio,
      keyTime: volume?.time,
      cursor: (locked
        ? "notAllowed"
        : nextMode === "move"
          ? "grab"
          : ["volume", "keyframe"].includes(nextMode)
            ? "ns"
            : "ew") as CanvasCursor,
    };
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.focus({ preventScroll: true });
    const point = pos(e);
    const target = targetAt(point);
    const { zoom } = state.current;
    transport.pause();
    e.currentTarget.setPointerCapture(e.pointerId);
    if (target.mode === "seek") {
      gesture.current = { mode: "seek", ...point };
      transport.seek((point.x + offset.current) / zoom);
      store.patch({ selected: null });
      setCanvasCursor(e.currentTarget, "col");
    } else {
      store.patch({ selected: target.clip.id });
      if (target.locked) {
        setCanvasCursor(e.currentTarget, "notAllowed");
        return;
      }
      const original = structuredClone(target.clip);
      const local = Math.max(
        0,
        Math.min(
          original.duration,
          (point.x + offset.current) / zoom - original.start,
        ),
      );
      const mode =
        rangeMode && target.hasAudio
          ? "range"
          : e.altKey && target.hasAudio && target.mode === "volume"
            ? "keyframe"
            : target.mode;
      const g: Gesture = {
        mode,
        clip: original,
        ...point,
        rangeStart: local,
        rangeEnd: local,
        keyTime: target.keyTime,
      };
      if (mode === "keyframe" && g.keyTime !== undefined) {
        g.rangeStart = (g.keyTime - original.in) / original.speed;
        g.rangeEnd = g.rangeStart;
      }
      if (mode === "keyframe" && g.keyTime === undefined) {
        const time = Math.round(local * p.fps) / p.fps;
        original.volumeKeyframes = putVolumePoint(
          original,
          time,
          volumeAt(original, sourceTime(original, time)),
        );
        g.keyTime = sourceTime(original, time);
        g.rangeStart = time;
        g.rangeEnd = time;
        g.ghost = { ...original };
      }
      if (mode !== "volume" && mode !== "keyframe" && mode !== "range")
        setRange(null);
      gesture.current = g;
      setCanvasCursor(
        e.currentTarget,
        mode === "range"
          ? "crosshair"
          : ["volume", "keyframe"].includes(mode)
            ? "ns"
            : mode === "move"
              ? "grabbing"
              : "ew",
      );
    }
    dirty.current = true;
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const now = performance.now();
    const g = gesture.current,
      point = pos(e);
    if (!g) {
      setCanvasCursor(e.currentTarget, targetAt(point).cursor);
      return;
    }
    if (g.mode === "seek") {
      transport.seek((point.x + offset.current) / zoom);
      meter.input(now);
      return;
    }
    const c = g.clip!;
    const delta = (point.x - g.x) / zoom;
    if (g.mode === "range") {
      g.rangeEnd = Math.max(
        0,
        Math.min(
          c.duration,
          Math.round(((point.x + offset.current) / zoom - c.start) * p.fps) /
            p.fps,
        ),
      );
      dirty.current = true;
      meter.input(now);
      return;
    }
    const q = { ...c };
    if (g.mode === "volume" || g.mode === "keyframe") {
      const local = g.rangeStart!;
      const originalGain = volumeAt(c, g.keyTime ?? sourceTime(c, local));
      const gain = dbToGain(
        Math.max(
          -60,
          Math.min(
            12,
            gainToDb(originalGain) -
              (point.y - g.y) * (e.shiftKey ? 0.2 : 72 / 26),
          ),
        ),
      );
      if (g.mode === "keyframe") {
        const time = sourceTime(
          c,
          Math.max(
            0,
            Math.min(c.duration, Math.round((local + delta) * p.fps) / p.fps),
          ),
        );
        g.rangeEnd = (time - c.in) / c.speed;
        q.volumeKeyframes = normalizeVolumePoints([
          ...c.volumeKeyframes.filter(
            (k) => k.time !== g.keyTime && Math.abs(k.time - time) > 1e-7,
          ),
          { time, value: gain },
        ]);
      } else if (
        range?.clipId === c.id &&
        local >= range.start &&
        local <= range.end
      ) {
        q.volumeKeyframes = duckVolumeRange(c, range.start, range.end, gain);
      } else {
        Object.assign(
          q,
          setClipVolume(
            c,
            dbToGain(
              Math.max(
                -60,
                Math.min(
                  12,
                  gainToDb(c.volume) -
                    (point.y - g.y) * (e.shiftKey ? 0.2 : 72 / 26),
                ),
              ),
            ),
          ),
        );
      }
      if (point.y !== g.y || (g.mode === "keyframe" && point.x !== g.x))
        g.ghost = q;
      dirty.current = true;
      meter.input(now);
      return;
    }
    const shouldSnap = snap && !e.altKey;
    const snapper = (t: number) =>
      shouldSnap
        ? snapTime(t, p, c.id, transport.time, 8 / zoom)
        : Math.max(0, t);
    if (g.mode === "move") {
      q.start = snapper(c.start + delta);
      const ti = Math.max(
        0,
        Math.min(
          p.tracks.length - 1,
          Math.floor((point.y - TOP + scrollY.current) / ROW),
        ),
      );
      if (
        !p.tracks[ti].locked &&
        p.tracks[ti].type === p.tracks.find((t) => t.id === c.trackId)?.type
      )
        q.trackId = p.tracks[ti].id;
    }
    if (g.mode === "left") {
      const start = Math.min(
        c.start + c.duration - 1 / p.fps,
        Math.max(c.start - c.in / c.speed, snapper(c.start + delta)),
      );
      q.start = start;
      q.duration = c.start + c.duration - start;
      q.in = c.in + (start - c.start) * c.speed;
    }
    if (g.mode === "right") {
      const a = p.assets.find((a) => a.id === c.assetId);
      const max =
        a && ["video", "audio"].includes(a.kind)
          ? (a.duration - c.in) / c.speed
          : 3600;
      q.duration = Math.min(
        max,
        Math.max(1 / p.fps, snapper(c.start + c.duration + delta) - c.start),
      );
    }
    g.ghost = q;
    dirty.current = true;
    meter.input(now);
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = gesture.current;
    gesture.current = undefined;
    if (g?.mode === "range" && g.clip) {
      const start = Math.min(g.rangeStart!, g.rangeEnd!),
        end = Math.max(g.rangeStart!, g.rangeEnd!);
      if (end - start >= 1 / p.fps) setRange({ clipId: g.clip.id, start, end });
      setRangeMode(false);
    }
    if (g?.ghost) {
      store.safe(() => {
        const next = g.ghost!,
          original = g.clip!;
        const delta =
          next.start + next.duration - (original.start + original.duration);
        store.apply([
          { op: "update_clip", id: next.id, patch: next },
          ...(ripple && (g.mode === "left" || g.mode === "right")
            ? p.clips
                .filter(
                  (c) =>
                    c.id !== original.id &&
                    c.trackId === original.trackId &&
                    c.start >= original.start + original.duration - 1e-6,
                )
                .map((c) => ({
                  op: "update_clip" as const,
                  id: c.id,
                  patch: { start: Math.max(0, c.start + delta) },
                }))
            : []),
        ]);
      });
    }
    dirty.current = true;
    setCanvasCursor(e.currentTarget, targetAt(pos(e)).cursor);
  };
  const selectedClip = p.clips.find((c) => c.id === selected);
  return (
    <section
      aria-label="Timeline"
      className={cn(
        "flex min-h-40 shrink-0 flex-col",
        heightClass,
        skin.border,
        skin.panel,
      )}
    >
      <div
        className={cn(
          "flex h-11 shrink-0 items-center justify-between border-b px-3",
          skin.border,
        )}
      >
        <div className={cn("flex items-center gap-1", skin.muted)}>
          <IconButton
            label="Split at playhead (S)"
            disabled={!selectedClip}
            onClick={() =>
              store.safe(() =>
                store.apply([
                  { op: "split", id: selected!, time: transport.time },
                ]),
              )
            }
          >
            <ScissorsIcon size={16} />
          </IconButton>
          <IconButton
            label="Duplicate segment"
            disabled={!selectedClip}
            onClick={duplicateClip}
          >
            <CopyIcon size={16} />
          </IconButton>
          <IconButton
            label="Delete segment"
            disabled={!selectedClip}
            onClick={() =>
              store.safe(() =>
                store.apply([{ op: "delete_clip", id: selected!, ripple }]),
              )
            }
          >
            <TrashIcon size={16} />
          </IconButton>
          <span className={cn("mx-2 h-4 border-l", skin.border)} />
          <IconButton
            label="Snapping"
            aria-pressed={snap}
            onClick={() => setSnap(!snap)}
            className={snap ? editor.active : ""}
          >
            <MagnetIcon size={17} />
          </IconButton>
          <IconButton
            label="Ripple editing"
            aria-pressed={ripple}
            onClick={() => setRipple(!ripple)}
            className={ripple ? editor.active : ""}
          >
            <ArrowsDownUpIcon size={16} />
          </IconButton>
          <Button
            variant="ghost"
            aria-label="Select audio range (R)"
            aria-pressed={rangeMode}
            className={rangeMode ? editor.active : ""}
            onClick={() => setRangeMode(!rangeMode)}
          >
            <SelectionIcon size={16} /> Range
          </Button>
          {range && (
            <Button variant="ghost" onClick={() => setRangeDialog(true)}>
              Lower range
            </Button>
          )}
        </div>
        <div className={cn("flex items-center gap-1", skin.muted)}>
          <span className={cn("hidden text-xs xl:block", skin.muted)}>
            R: audio range · Option-click: volume point
          </span>
          <IconButton
            label="Zoom out"
            onClick={() => setZoom(Math.max(10, zoom / 1.3))}
          >
            <MinusIcon size={13} />
          </IconButton>
          <input
            aria-label="Timeline zoom"
            type="range"
            min="10"
            max="240"
            value={zoom}
            onChange={(e) => {
              setZoom(+e.target.value);
              dirty.current = true;
            }}
            className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-zinc-200 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500 [[data-theme=dark]_&]:bg-zinc-700"
          />
          <IconButton
            label="Zoom in"
            onClick={() => setZoom(Math.min(240, zoom * 1.3))}
          >
            <PlusIcon size={13} />
          </IconButton>
          <Button
            variant="ghost"
            onClick={() => {
              offset.current = 0;
              setZoom(
                Math.max(
                  10,
                  ((wrap.current?.clientWidth || 600) / duration(p)) * 0.9,
                ),
              );
              dirty.current = true;
            }}
          >
            Fit
          </Button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <div
          className={cn(
            "flex min-w-0 shrink-0 flex-col",
            panelSizeClass(trackWidth),
          )}
        >
          <div
            className={cn(
              "flex h-[26px] shrink-0 items-center justify-between border-b px-3 text-xs",
              skin.border,
              skin.muted,
            )}
          >
            <span className="font-medium">Tracks</span>
            <div className="flex">
              <button
                aria-label="Add video track"
                title="Add video track"
                className="flex size-6 items-center justify-center rounded hover:bg-indigo-400/10"
                onClick={() =>
                  store.apply([
                    {
                      op: "add_track",
                      track: track(`Video ${p.tracks.length}`),
                    },
                  ])
                }
              >
                <PlusIcon size={16} />
              </button>
              <button
                aria-label="Add audio track"
                title="Add audio track"
                className="flex size-6 items-center justify-center rounded hover:bg-indigo-400/10"
                onClick={() =>
                  store.apply([
                    {
                      op: "add_track",
                      track: track(`Audio ${p.tracks.length}`, "audio"),
                    },
                  ])
                }
              >
                <SpeakerHighIcon size={16} />
              </button>
            </div>
          </div>
          <div
            ref={labels}
            className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none]"
            onScroll={(e) => {
              scrollY.current = e.currentTarget.scrollTop;
              dirty.current = true;
            }}
          >
            {p.tracks.map((t, i) => (
              <div
                key={t.id}
                data-track-controls
                className={cn(
                  "group flex h-16 flex-col justify-center gap-1 border-b px-3",
                  skin.border,
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <input
                    aria-label={`Track name ${i + 1}`}
                    value={t.name}
                    onChange={(e) =>
                      store.apply([
                        {
                          op: "update_track",
                          id: t.id,
                          patch: { name: e.target.value },
                        },
                      ])
                    }
                    className="min-w-0 flex-1 rounded bg-transparent text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  />
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      t.type === "audio" ? "bg-emerald-400" : "bg-indigo-400",
                    )}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded hover:bg-indigo-500/10",
                      t.hidden && editor.active,
                    )}
                    aria-label={`${t.hidden ? "Show" : "Hide"} ${t.name}`}
                    onClick={() =>
                      store.apply([
                        {
                          op: "update_track",
                          id: t.id,
                          patch: { hidden: !t.hidden },
                        },
                      ])
                    }
                  >
                    {t.hidden ? (
                      <EyeSlashIcon size={16} />
                    ) : (
                      <EyeIcon size={16} />
                    )}
                  </button>
                  <button
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded hover:bg-indigo-500/10",
                      t.muted && editor.active,
                    )}
                    aria-label={`${t.muted ? "Unmute" : "Mute"} ${t.name}`}
                    onClick={() =>
                      store.apply([
                        {
                          op: "update_track",
                          id: t.id,
                          patch: { muted: !t.muted },
                        },
                      ])
                    }
                  >
                    {t.muted ? (
                      <SpeakerSlashIcon size={16} />
                    ) : (
                      <SpeakerHighIcon size={16} />
                    )}
                  </button>
                  <button
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded hover:bg-indigo-500/10",
                      t.locked && editor.active,
                    )}
                    aria-label={`${t.locked ? "Unlock" : "Lock"} ${t.name}`}
                    onClick={() =>
                      store.apply([
                        {
                          op: "update_track",
                          id: t.id,
                          patch: { locked: !t.locked },
                        },
                      ])
                    }
                  >
                    {t.locked ? (
                      <LockSimpleIcon size={16} />
                    ) : (
                      <LockSimpleOpenIcon size={16} />
                    )}
                  </button>
                  <button
                    aria-label={`Move ${t.name} up`}
                    disabled={!i}
                    onClick={() => {
                      const next = [...p.tracks];
                      [next[i - 1], next[i]] = [next[i], next[i - 1]];
                      store.replace({
                        ...p,
                        tracks: next,
                        revision: p.revision + 1,
                      });
                    }}
                    className="ml-auto flex size-6 shrink-0 items-center justify-center rounded hover:bg-indigo-400/10 disabled:opacity-20"
                  >
                    <ArrowUpIcon size={16} />
                  </button>
                  <button
                    aria-label={`Move ${t.name} down`}
                    disabled={i === p.tracks.length - 1}
                    onClick={() => {
                      const next = [...p.tracks];
                      [next[i + 1], next[i]] = [next[i], next[i + 1]];
                      store.replace({
                        ...p,
                        tracks: next,
                        revision: p.revision + 1,
                      });
                    }}
                    className="flex size-6 shrink-0 items-center justify-center rounded hover:bg-indigo-400/10 disabled:opacity-20"
                  >
                    <ArrowDownIcon size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <PanelDivider
          label="Resize track labels"
          value={trackWidth}
          min={160}
          max={320}
          initial={176}
          onChange={setTrackWidth}
        />
        <div
          ref={wrap}
          className="relative min-w-0 flex-1 overflow-hidden"
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("application/sequence-asset"))
              e.preventDefault();
          }}
          onDrop={(e) => {
            const id = e.dataTransfer.getData("application/sequence-asset");
            if (!id) return;
            e.preventDefault();
            e.stopPropagation();
            const point = pos(e);
            const ti = Math.max(
              0,
              Math.min(
                p.tracks.length - 1,
                Math.floor((point.y - TOP + scrollY.current) / ROW),
              ),
            );
            store.safe(() =>
              addAsset(
                id,
                p.tracks[ti].id,
                Math.max(0, (point.x + offset.current) / zoom),
              ),
            );
          }}
        >
          <canvas
            aria-label="Timeline canvas"
            tabIndex={0}
            data-testid="timeline-canvas"
            ref={canvas}
            className="block size-full touch-none font-sans text-xs outline-none"
            onPointerDown={onDown}
            onDoubleClick={(e) => {
              const point = pos(e),
                target = targetAt(point);
              if (target.mode !== "volume" || target.locked) return;
              const c = target.clip;
              const local =
                Math.round(
                  ((point.x + offset.current) / zoom - c.start) * p.fps,
                ) / p.fps;
              store.safe(() =>
                store.apply([
                  {
                    op: "update_clip",
                    id: c.id,
                    patch: {
                      volumeKeyframes: putVolumePoint(
                        c,
                        local,
                        volumeAt(c, sourceTime(c, local)),
                      ),
                    },
                  },
                ]),
              );
            }}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={() => {
              gesture.current = undefined;
              dirty.current = true;
              if (canvas.current) setCanvasCursor(canvas.current, "default");
            }}
            onPointerLeave={(e) => {
              if (!gesture.current) setCanvasCursor(e.currentTarget, "default");
            }}
            onWheel={(e) => {
              if (e.ctrlKey) {
                setZoom((z) =>
                  Math.max(10, Math.min(240, z * (e.deltaY < 0 ? 1.1 : 0.9))),
                );
              } else if (
                e.shiftKey ||
                Math.abs(e.deltaX) > Math.abs(e.deltaY)
              ) {
                offset.current = Math.max(
                  0,
                  offset.current + (e.deltaX || e.deltaY),
                );
                dirty.current = true;
              } else if (labels.current) {
                labels.current.scrollTop += e.deltaY;
              }
              dirty.current = true;
            }}
          />
          {!p.clips.length && (
            <div
              className={cn(
                "pointer-events-none absolute inset-0 flex items-center justify-center text-xs",
                skin.muted,
              )}
            >
              Drag your media here to start a story
            </div>
          )}
          <div className="sr-only">
            {p.clips.map((c) => (
              <button
                key={c.id}
                aria-label={`Select segment ${c.name}`}
                onClick={() => {
                  store.patch({ selected: c.id });
                  if (
                    transport.time < c.start ||
                    transport.time >= c.start + c.duration
                  )
                    transport.seek(c.start);
                }}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>
      {rangeDialog && range && p.clips.find((c) => c.id === range.clipId) && (
        <AudioRangeDialog
          clip={p.clips.find((c) => c.id === range.clipId)!}
          range={range}
          onClose={() => setRangeDialog(false)}
          onApply={(volumeKeyframes) =>
            store.safe(() => {
              store.apply([
                {
                  op: "update_clip",
                  id: range.clipId,
                  patch: { volumeKeyframes },
                },
              ]);
              setRangeDialog(false);
            })
          }
        />
      )}
    </section>
  );
}
