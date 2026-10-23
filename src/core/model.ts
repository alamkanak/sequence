import { z } from "zod";
import { normalizeVolumePoints, type VolumePoint } from "./audio-envelope";
export const uid = () => crypto.randomUUID();
export type Kind =
  "video" | "audio" | "image" | "gif" | "text" | "shape" | "vector";
export type Motion = "none" | "fade" | "slide" | "zoom";
export interface Asset {
  id: string;
  name: string;
  kind: Kind;
  duration: number;
  width: number;
  height: number;
  fps: number;
  hasAudio: boolean;
  hdr: boolean;
  thumbnail?: string;
  size: number;
  type: string;
}
export interface Track {
  id: string;
  name: string;
  type: "visual" | "audio";
  hidden: boolean;
  muted: boolean;
  locked: boolean;
}
export interface Keyframe {
  property: "x" | "y" | "rotation" | "opacity" | "scale";
  time: number;
  value: number;
}
export interface GradientStop {
  offset: number;
  color: string;
  opacity: number;
}
export interface Gradient {
  type: "linear" | "radial";
  angle: number;
  stops: GradientStop[];
}
export interface Clip {
  id: string;
  trackId: string;
  assetId?: string;
  kind: Kind;
  name: string;
  start: number;
  duration: number;
  in: number;
  speed: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  scale: number;
  anchorX: number;
  anchorY: number;
  volume: number;
  volumeKeyframes: VolumePoint[];
  fadeIn: number;
  fadeOut: number;
  enter: Motion;
  exit: Motion;
  animDuration: number;
  text: string;
  font: string;
  fontSize: number;
  fill: string;
  fillOpacity: number;
  fillGradient: Gradient | null;
  stroke: string;
  strokeOpacity: number;
  strokeGradient: Gradient | null;
  strokeWidth: number;
  shape: "rectangle" | "ellipse" | "line";
  radius: number;
  keyframes: Keyframe[];
}
export interface Project {
  version: 1;
  id: string;
  revision: number;
  name: string;
  width: number;
  height: number;
  fps: number;
  background: string;
  initialized: boolean;
  tracks: Track[];
  clips: Clip[];
  assets: Asset[];
}
export const duration = (p: Project) =>
  Math.max(1, ...p.clips.map((c) => c.start + c.duration));
export const track = (name: string, type: Track["type"] = "visual"): Track => ({
  id: uid(),
  name,
  type,
  hidden: false,
  muted: false,
  locked: false,
});
export function emptyProject(): Project {
  return {
    version: 1,
    id: uid(),
    revision: 0,
    name: "Untitled project",
    width: 1920,
    height: 1080,
    fps: 30,
    background: "#0d1017",
    initialized: false,
    tracks: [
      track("Titles & elements"),
      track("Video 1"),
      track("Audio 1", "audio"),
    ],
    clips: [],
    assets: [],
  };
}
export function newClip(
  p: Project,
  kind: Kind,
  trackId: string,
  start = 0,
  asset?: Asset,
): Clip {
  const aspect =
    asset?.width && asset.height
      ? asset.width / asset.height
      : p.width / p.height;
  const h = kind === "text" ? 0.15 : kind === "shape" ? 0.22 : 1;
  return {
    id: uid(),
    trackId,
    assetId: asset?.id,
    kind,
    name:
      asset?.name ||
      (kind === "text"
        ? "Your next story"
        : kind === "vector"
          ? "Orbit animation"
          : "Rectangle"),
    start,
    duration: asset?.duration || 4,
    in: 0,
    speed: 1,
    x: 0.5,
    y: 0.5,
    width:
      kind === "shape"
        ? 0.3
        : kind === "text"
          ? 0.75
          : Math.min(1, aspect / (p.width / p.height)),
    height: h,
    rotation: 0,
    opacity: 1,
    scale: 1,
    anchorX: 0.5,
    anchorY: 0.5,
    volume: 1,
    volumeKeyframes: [],
    fadeIn: 0,
    fadeOut: 0,
    enter: "none",
    exit: "none",
    animDuration: 0.5,
    text: "Your next story",
    font: "sans-serif",
    fontSize: Math.round(p.height * 0.075),
    fill: kind === "shape" ? "#a5b4fc" : "#ffffff",
    fillOpacity: 1,
    fillGradient: null,
    stroke: "#ffffff",
    strokeOpacity: 1,
    strokeGradient: null,
    strokeWidth: 0,
    shape: "rectangle",
    radius: 18,
    keyframes: [],
  };
}
/** Element presets use project pixels so circles stay circular in every aspect ratio. */
export function newElement(
  p: Project,
  kind: Kind,
  trackId: string,
  start = 0,
  shape?: "rectangle" | "ellipse" | "line",
): Clip {
  const c = newClip(p, kind, trackId, start);
  if (shape) {
    c.shape = shape;
    c.name = shape[0].toUpperCase() + shape.slice(1);
    if (shape === "ellipse") {
      const size = Math.min(p.width, p.height) * 0.3;
      c.width = size / p.width;
      c.height = size / p.height;
    }
  }
  if (kind === "vector") {
    c.width = 0.35;
    c.height = 0.5;
    c.fill = "#b9acf6";
  }
  return c;
}
const finite = z.number().finite();
const positive = finite.positive();
const id = z.string().min(1).max(160);
const color = z.string().regex(/^#[\da-f]{6}$/i);
const gradient = z.object({
  type: z.enum(["linear", "radial"]),
  angle: finite,
  stops: z
    .array(
      z.object({
        offset: finite.min(0).max(1),
        color,
        opacity: finite.min(0).max(1),
      }),
    )
    .min(2)
    .max(8),
});
const kind = z.enum([
  "video",
  "audio",
  "image",
  "gif",
  "text",
  "shape",
  "vector",
]);
export const projectSchema = z.object({
  version: z.literal(1),
  id,
  revision: finite.int().nonnegative(),
  name: z.string().max(200),
  width: positive.int().max(7680),
  height: positive.int().max(7680),
  fps: positive.max(120),
  background: color,
  initialized: z.boolean(),
  tracks: z
    .array(
      z.object({
        id,
        name: z.string().max(100),
        type: z.enum(["visual", "audio"]),
        hidden: z.boolean(),
        muted: z.boolean(),
        locked: z.boolean(),
      }),
    )
    .min(1)
    .max(64),
  assets: z
    .array(
      z.object({
        id,
        name: z.string(),
        kind,
        duration: finite.nonnegative(),
        width: finite.nonnegative(),
        height: finite.nonnegative(),
        fps: finite.nonnegative(),
        hasAudio: z.boolean(),
        hdr: z.boolean(),
        thumbnail: z.string().optional(),
        size: finite.nonnegative(),
        type: z.string(),
      }),
    )
    .max(2000),
  clips: z
    .array(
      z.object({
        id,
        trackId: id,
        assetId: id.optional(),
        kind,
        name: z.string().max(500),
        start: finite.nonnegative(),
        duration: positive,
        in: finite.nonnegative(),
        speed: positive.min(0.1).max(8),
        x: finite,
        y: finite,
        width: positive,
        height: positive,
        rotation: finite,
        opacity: finite.min(0).max(1),
        scale: positive,
        anchorX: finite,
        anchorY: finite,
        volume: finite.min(0).max(4),
        volumeKeyframes: z
          .array(
            z.object({
              time: finite.nonnegative(),
              value: finite.min(0).max(4),
            }),
          )
          .max(1000)
          .default([]),
        fadeIn: finite.nonnegative(),
        fadeOut: finite.nonnegative(),
        enter: z.enum(["none", "fade", "slide", "zoom"]),
        exit: z.enum(["none", "fade", "slide", "zoom"]),
        animDuration: positive,
        text: z.string().max(20000),
        font: z.enum(["sans-serif", "serif", "monospace"]),
        fontSize: positive,
        fill: color,
        fillOpacity: finite.min(0).max(1).default(1),
        fillGradient: gradient.nullable().default(null),
        stroke: color,
        strokeOpacity: finite.min(0).max(1).default(1),
        strokeGradient: gradient.nullable().default(null),
        strokeWidth: finite.nonnegative(),
        shape: z.enum(["rectangle", "ellipse", "line"]),
        radius: finite.nonnegative(),
        keyframes: z
          .array(
            z.object({
              property: z.enum(["x", "y", "rotation", "opacity", "scale"]),
              time: finite.nonnegative(),
              value: finite,
            }),
          )
          .max(1000),
      }),
    )
    .max(10000),
});
export function validateProject(value: unknown): Project {
  const p = projectSchema.parse(value) as Project;
  if (
    new Set(p.tracks.map((t) => t.id)).size !== p.tracks.length ||
    new Set(p.clips.map((c) => c.id)).size !== p.clips.length ||
    new Set(p.assets.map((a) => a.id)).size !== p.assets.length
  )
    throw new Error("Duplicate identifiers");
  for (const c of p.clips) {
    c.volumeKeyframes = normalizeVolumePoints(c.volumeKeyframes);
    if (!p.tracks.some((t) => t.id === c.trackId))
      throw new Error("Clip references a missing track");
    if (c.assetId && !p.assets.some((a) => a.id === c.assetId))
      throw new Error("Clip references missing media");
    const a = p.assets.find((a) => a.id === c.assetId);
    if (
      a &&
      ["video", "audio"].includes(a.kind) &&
      c.in + c.duration * c.speed > a.duration + 0.1
    )
      throw new Error("Clip exceeds available source media");
  }
  return p;
}
export type Edit =
  | { op: "add_clip"; clip: Clip }
  | { op: "update_clip"; id: string; patch: Partial<Clip> }
  | { op: "delete_clip"; id: string; ripple?: boolean }
  | { op: "delete_asset"; id: string }
  | { op: "split"; id: string; time: number }
  | { op: "add_track"; track: Track }
  | { op: "update_track"; id: string; patch: Partial<Track> }
  | { op: "delete_track"; id: string }
  | {
      op: "project";
      patch: Partial<
        Pick<
          Project,
          "name" | "width" | "height" | "fps" | "background" | "initialized"
        >
      >;
    }
  | { op: "transition"; id: string; seconds: number };
export function editProject(original: Project, edits: Edit[]): Project {
  const p = structuredClone(original);
  for (const e of edits) {
    if (e.op === "delete_asset") {
      if (!p.assets.some((a) => a.id === e.id))
        throw new Error("Media not found");
      if (
        p.clips.some(
          (c) =>
            c.assetId === e.id &&
            p.tracks.find((t) => t.id === c.trackId)?.locked,
        )
      )
        throw new Error("Unlock tracks using this media before removing it");
      p.clips = p.clips.filter((c) => c.assetId !== e.id);
      p.assets = p.assets.filter((a) => a.id !== e.id);
    }
    if (e.op === "project") Object.assign(p, e.patch);
    if (e.op === "add_track") p.tracks.unshift(e.track);
    if (e.op === "update_track") {
      const t = p.tracks.find((t) => t.id === e.id);
      if (!t) throw new Error("Track not found");
      Object.assign(t, e.patch, { id: t.id });
    }
    if (e.op === "delete_track") {
      if (p.tracks.length === 1) throw new Error("Keep at least one track");
      p.tracks = p.tracks.filter((t) => t.id !== e.id);
      p.clips = p.clips.filter((c) => c.trackId !== e.id);
    }
    if (e.op === "add_clip") {
      if (p.tracks.find((t) => t.id === e.clip.trackId)?.locked)
        throw new Error("Track is locked");
      p.clips.push(e.clip);
    }
    if (["update_clip", "delete_clip", "split", "transition"].includes(e.op)) {
      const c = p.clips.find((c) => c.id === ("id" in e ? e.id : ""));
      if (!c) throw new Error("Clip not found");
      if (p.tracks.find((t) => t.id === c.trackId)?.locked)
        throw new Error("Track is locked");
      if (e.op === "update_clip") Object.assign(c, e.patch, { id: c.id });
      if (e.op === "delete_clip") {
        p.clips = p.clips.filter((x) => x.id !== c.id);
        if (e.ripple)
          p.clips
            .filter(
              (x) =>
                x.trackId === c.trackId &&
                x.start >= c.start + c.duration - 1e-6,
            )
            .forEach(
              (x) => (x.start = Math.max(c.start, x.start - c.duration)),
            );
      }
      if (e.op === "split") {
        const left = e.time - c.start;
        if (left < 1 / p.fps || c.duration - left < 1 / p.fps)
          throw new Error("Split inside the segment");
        const right = {
          ...structuredClone(c),
          id: uid(),
          start: e.time,
          in: c.in + left * c.speed,
          duration: c.duration - left,
          enter: "none" as Motion,
          fadeIn: 0,
          keyframes: c.keyframes
            .filter((k) => k.time >= left)
            .map((k) => ({ ...k, time: k.time - left })),
        };
        c.duration = left;
        c.exit = "none";
        c.fadeOut = 0;
        c.keyframes = c.keyframes.filter((k) => k.time <= left);
        p.clips.push(right);
      }
      if (e.op === "transition") {
        const prev = p.clips
          .filter(
            (x) =>
              x.id !== c.id && x.trackId === c.trackId && x.start < c.start,
          )
          .sort((a, b) => b.start - a.start)[0];
        if (!prev) throw new Error("Add a preceding clip on this track first");
        if (e.seconds < 0 || e.seconds >= Math.min(c.duration, prev.duration))
          throw new Error("Transition is longer than its clips");
        c.start = prev.start + prev.duration - e.seconds;
        c.fadeIn = e.seconds;
      }
    }
  }
  p.revision = original.revision + 1;
  return validateProject(p);
}
export function snapTime(
  t: number,
  p: Project,
  exclude: string,
  playhead: number,
  tolerance: number,
) {
  const points = [
    0,
    playhead,
    ...p.clips
      .filter((c) => c.id !== exclude)
      .flatMap((c) => [c.start, c.start + c.duration]),
  ];
  let result = t,
    dist = tolerance;
  for (const point of points)
    if (Math.abs(point - t) < dist) {
      dist = Math.abs(point - t);
      result = point;
    }
  return Math.max(0, result);
}
