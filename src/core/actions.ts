import {
  newClip,
  newElement,
  track,
  uid,
  duration,
  emptyProject,
  type Asset,
  type Kind,
  type Project,
} from "./model";
import { store } from "./store";
import { assetFiles, inspectMedia } from "../engine/client";
import { get, put, saveProject } from "./storage";
import { transport } from "../engine/transport";
import { prepareWaveform } from "./waveforms";
import { TimelineClipboard } from "./clipboard";
const timelineClipboard = new TimelineClipboard();
export const hasTimelineClipboard = () => timelineClipboard.populated;
export function copySelectedClip() {
  const { project, selected } = store.get();
  const clip = project.clips.find((c) => c.id === selected);
  if (clip) timelineClipboard.copy(clip);
}
export function pasteTimelineClip() {
  store.safe(() => {
    const result = timelineClipboard.paste(store.get().project, transport.time);
    if (!result) return;
    transport.pause();
    store.apply(result.edits);
    store.patch({ selected: result.selected });
    transport.seek(transport.time);
  });
}
async function attachFile(asset: Asset, file: File, existing = false) {
  const p = store.get().project;
  transport.pause();
  assetFiles.set(asset.id, file);
  transport.engine?.setFile(asset.id, file);
  prepareWaveform(asset, file);
  const project = {
    ...p,
    assets: existing
      ? p.assets.map((a) => (a.id === asset.id ? asset : a))
      : [...p.assets, asset],
    revision: p.revision + 1,
  };
  if (existing) {
    // Restoring file access must notify the UI and renderer without adding an
    // edit to undo or discarding a pending redo.
    store.patch({ project, dirty: true, error: "" });
  } else store.replace(project);
  transport.seek(transport.time);
  try {
    await put("files", asset.id, file);
  } catch {
    store.patch({
      error: `${file.name} is available for this session, but could not be saved in browser storage. Keep the original file to relink next time.`,
    });
  }
  if (asset.hdr)
    store.patch({
      error:
        "HDR source detected. Preview is SDR; export requires explicit SDR tone-mapping consent.",
    });
}

/** Explicit selection can restore renamed/moved media while keeping every clip. */
export async function relinkAsset(id: string, file: File) {
  const before = store.get().project;
  const original = before.assets.find((a) => a.id === id);
  if (!original) throw new Error("This media is no longer in the project");
  if (assetFiles.has(id)) throw new Error("This media is already linked");
  const inspected = await inspectMedia(file);
  const current = store.get().project;
  if (current.id !== before.id || !current.assets.some((a) => a.id === id))
    throw new Error("The project changed. Choose the missing file again.");
  if (inspected.kind !== original.kind)
    throw new Error(
      `Choose a ${original.kind} file to relink ${original.name}.`,
    );
  if (inspected.kind === "video" || inspected.kind === "audio") {
    const needed = Math.max(
      0,
      ...current.clips
        .filter((c) => c.assetId === id)
        .map((c) => c.in + c.duration * c.speed),
    );
    if (inspected.duration + 1 / (inspected.fps || 30) < needed)
      throw new Error(
        `${file.name} is too short for the existing edits. Choose the original media (${needed.toFixed(1)}s needed).`,
      );
  }
  await attachFile({ ...inspected, id }, file, true);
}

/** Bulk restore uses exact identity hints; renamed files use explicit selection. */
export async function relinkFiles(files: File[]) {
  const missing = store
    .get()
    .project.assets.filter((a) => !assetFiles.has(a.id));
  const projectId = store.get().project.id;
  let linked = 0;
  const used = new Set<File>();
  for (const asset of missing) {
    const matches = files.filter(
      (f) => f.name === asset.name && f.size === asset.size,
    );
    if (matches.length !== 1) continue;
    if (store.get().project.id !== projectId)
      throw new Error("The project changed. Choose the missing files again.");
    if (!store.get().project.assets.some((a) => a.id === asset.id)) continue;
    await attachFile(asset, matches[0], true);
    used.add(matches[0]);
    linked++;
  }
  return {
    linked,
    unmatched: files.filter((f) => !used.has(f)).map((f) => f.name),
  };
}

export async function importFiles(files: File[]) {
  for (const file of files) {
    try {
      const projectId = store.get().project.id;
      const existing = store
        .get()
        .project.assets.filter(
          (a) =>
            a.name === file.name &&
            a.size === file.size &&
            !assetFiles.has(a.id),
        );
      if (existing.length) {
        await relinkFiles([file]);
      } else {
        const asset = await inspectMedia(file);
        if (store.get().project.id !== projectId)
          throw new Error("The project changed. Import the file again.");
        await attachFile(asset, file);
      }
    } catch (e) {
      store.patch({
        error: `${file.name}: ${e instanceof Error ? e.message : e}`,
      });
    }
  }
}
export function removeAsset(id: string) {
  transport.pause();
  store.apply([{ op: "delete_asset", id }]);
  const { selected, project } = store.get();
  if (selected && !project.clips.some((c) => c.id === selected))
    store.patch({ selected: null });
  // Retain the local file so undo can restore media and its segments immediately.
  transport.seek(transport.time);
}
export function addAsset(id: string, target?: string, start?: number) {
  const p = store.get().project;
  const a = p.assets.find((a) => a.id === id);
  if (!a) return;
  const type = a.kind === "audio" ? "audio" : "visual";
  let t =
    p.tracks.find((t) => t.id === target && t.type === type && !t.locked) ||
    p.tracks.find(
      (t) =>
        t.type === type &&
        !t.locked &&
        (type === "audio" || t.name.includes("Video")),
    ) ||
    p.tracks.find((t) => t.type === type && !t.locked);
  if (!t) {
    t = track(type === "audio" ? "Audio" : "Video", type);
    store.apply([{ op: "add_track", track: t }]);
  }
  const next = { ...store.get().project };
  if (a.kind === "video" && !p.initialized) {
    next.width = a.width;
    next.height = a.height;
    next.fps = Math.min(120, Math.max(1, a.fps));
    next.initialized = true;
  }
  const at =
    start ??
    Math.max(
      0,
      ...next.clips
        .filter((c) => c.trackId === t!.id)
        .map((c) => c.start + c.duration),
    );
  const clip = newClip(next, a.kind, t.id, at, a);
  if (a.kind === "video" || a.kind === "image" || a.kind === "gif") {
    const ratio = a.width / a.height / (next.width / next.height);
    clip.width = Math.min(1, ratio);
    clip.height = Math.min(1, 1 / ratio);
  }
  store.replace({
    ...next,
    clips: [...next.clips, clip],
    revision: next.revision + 1,
  });
  store.patch({ selected: clip.id });
  transport.seek(clip.start);
}
export function addElement(
  kind: Kind,
  shape?: "rectangle" | "ellipse" | "line",
) {
  const p = store.get().project;
  const t = p.tracks.find((t) => t.type === "visual" && !t.locked);
  if (!t) return;
  const c = newElement(p, kind, t.id, transport.time, shape);
  store.safe(() => {
    store.apply([{ op: "add_clip", clip: c }]);
    store.patch({ selected: c.id });
  });
}
export function duplicateClip() {
  const p = store.get().project;
  const c = p.clips.find((c) => c.id === store.get().selected);
  if (c)
    store.safe(() => {
      const clip = {
        ...structuredClone(c),
        id: uid(),
        start: c.start + c.duration,
      };
      store.apply([{ op: "add_clip", clip }]);
      store.patch({ selected: clip.id });
    });
}
export async function restoreProject() {
  try {
    const p = await get<Project>("projects", "last");
    if (!p) return;
    store.replace(p, false);
    store.clearHistory();
    for (const a of p.assets) {
      const f = await get<File>("files", a.id);
      if (f) {
        assetFiles.set(a.id, f);
        prepareWaveform(a, f);
      }
    }
  } catch (e) {
    store.patch({
      error: `Could not restore project: ${e instanceof Error ? e.message : e}`,
    });
  }
}
let autosave: ReturnType<typeof setTimeout>;
store.subscribe(() => {
  if (!store.get().dirty) return;
  clearTimeout(autosave);
  autosave = setTimeout(() => {
    void saveProject(store.get().project).catch(() =>
      store.patch({
        error: "Autosave unavailable. Save the project JSON to keep your edit.",
      }),
    );
  }, 800);
});
export async function loadDemo() {
  const finishHistory = store.beginHistoryGroup();
  try {
    transport.pause();
    const p = emptyProject();
    p.name = "A quieter kind of motion";
    store.replace(p);
    for (const name of ["dusk.mp4", "coast.mp4", "ambient.wav"]) {
      const res = await fetch(`${import.meta.env.BASE_URL}demo/${name}`);
      if (!res.ok) throw new Error("Demo media could not be loaded");
      await importFiles([
        new File([await res.blob()], name, {
          type: name.endsWith("wav") ? "audio/wav" : "video/mp4",
        }),
      ]);
    }
    const q = store.get().project;
    const videoTrack = q.tracks[1].id,
      audioTrack = q.tracks[2].id,
      titleTrack = q.tracks[0].id;
    const first = newClip(q, "video", videoTrack, 0, q.assets[0]);
    const second = newClip(q, "video", videoTrack, 5, q.assets[1]);
    second.fadeIn = 1;
    const music = newClip(q, "audio", audioTrack, 0, q.assets[2]);
    music.duration = 11;
    music.volume = 0.65;
    music.fadeIn = 0.6;
    music.fadeOut = 1;
    const title = newClip(q, "text", titleTrack, 0.5);
    title.text = "Find your own pace.";
    title.name = title.text;
    title.fontSize = 48;
    title.height = 0.2;
    title.duration = 4.5;
    title.enter = "fade";
    title.exit = "fade";
    const subtitle = newClip(q, "text", titleTrack, 6);
    subtitle.text = "A little less noise.\nA little more space.";
    subtitle.name = "Closing title";
    subtitle.fontSize = 36;
    subtitle.duration = 4.5;
    subtitle.height = 0.25;
    subtitle.enter = "slide";
    subtitle.exit = "fade";
    store.replace({
      ...q,
      width: 960,
      height: 540,
      fps: 30,
      initialized: true,
      clips: [first, second, music, title, subtitle],
    });
    store.patch({ selected: null });
    transport.seek(0);
  } finally {
    finishHistory();
  }
}
