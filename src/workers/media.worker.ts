/// <reference types="@webgpu/types" />
import {
  AudioSample,
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  WebMOutputFormat,
  Output,
  StreamTarget,
  canEncodeVideo,
  canEncodeAudio,
} from "mediabunny";
import { duration, type Project } from "../core/model";
import {
  files,
  probeFile,
  analyzeWaveform,
  MediaSession,
  AudioMixer,
  blobData,
} from "../engine/media";
import { makeRenderer, type Renderer } from "../engine/scene";
import { NativeAudioTrack } from "../engine/audio-encoder";
let renderer: Renderer | undefined;
let media = new MediaSession();
let mixer = new AudioMixer();
let project: Project;
let pending: { id: number; time: number } | undefined;
let drawing = false;
let canceled = false;
const respond = (id: number, data: unknown) => postMessage({ id, data });
const fail = (id: number, e: unknown) =>
  postMessage({ id, error: e instanceof Error ? e.message : String(e) });
async function drain() {
  if (drawing || !renderer) return;
  drawing = true;
  while (pending) {
    const task = pending;
    pending = undefined;
    try {
      const now = performance.now();
      const layers = await media.layers(project, task.time);
      if (!pending) {
        renderer.draw(layers, project);
        respond(task.id, {
          ms: performance.now() - now,
          renderer: renderer.name,
          decoded: media.decoded,
          cacheBytes: layers.reduce(
            (n, l) =>
              n +
              ("codedWidth" in l.picture
                ? l.picture.codedWidth * l.picture.codedHeight
                : l.picture.width * l.picture.height) *
                4,
            0,
          ),
        });
      } else respond(task.id, { skipped: true });
    } catch (e) {
      fail(task.id, e);
    }
  }
  drawing = false;
}
export interface ExportSettings {
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  format: "mp4" | "webm";
  audio: boolean;
  allowToneMap: boolean;
  name: string;
}
async function exportVideo(p: Project, s: ExportSettings, id: number) {
  canceled = false;
  const started = performance.now();
  const total = duration(p),
    frames = Math.ceil(total * s.fps);
  const codec = s.format === "mp4" ? "avc" : "vp9",
    audioCodec = s.format === "mp4" ? "aac" : "opus";
  if (p.assets.some((a) => a.hdr) && !s.allowToneMap)
    throw new Error(
      "HDR sources require explicit SDR tone-mapping consent. HDR export is not supported.",
    );
  if (
    !(await canEncodeVideo(codec, {
      width: s.width,
      height: s.height,
      bitrate: s.bitrate,
      frameRate: s.fps,
    }))
  )
    throw new Error(
      `This browser cannot encode ${codec} at the requested settings.`,
    );
  const hasAudio =
    s.audio &&
    p.clips.some(
      (c) =>
        p.assets.find((a) => a.id === c.assetId)?.hasAudio &&
        !p.tracks.find((t) => t.id === c.trackId)?.muted &&
        (c.volume > 0 || c.volumeKeyframes.some((k) => k.value > 0)),
    );
  if (
    hasAudio &&
    !(await canEncodeAudio(audioCodec, {
      numberOfChannels: 2,
      sampleRate: 48000,
    }))
  )
    throw new Error(
      `This browser cannot encode ${audioCodec} audio. Choose WebM or disable audio.`,
    );
  const canvas = new OffscreenCanvas(s.width, s.height);
  const r = await makeRenderer(canvas);
  const session = new MediaSession(),
    audioMixer = new AudioMixer();
  let handle: FileSystemFileHandle | undefined;
  let target: StreamTarget | BufferTarget;
  try {
    const root = await navigator.storage.getDirectory();
    for await (const [name, entry] of (root as any).entries()) {
      if (name.startsWith("sequence-export-") && entry.kind === "file") {
        const old = await entry.getFile();
        if (Date.now() - old.lastModified > 86400000)
          await root.removeEntry(name).catch(() => {});
      }
    }
    handle = await root.getFileHandle(
      `sequence-export-${crypto.randomUUID()}.${s.format}`,
      { create: true },
    );
    const writable = await handle.createWritable();
    target = new StreamTarget(writable, { chunked: true, chunkSize: 2 ** 20 });
  } catch {
    if ((total * s.bitrate) / 8 > 192 * 1024 * 1024)
      throw new Error(
        "Large exports need browser private-file storage. Free disk space or use Chrome/Edge.",
      );
    target = new BufferTarget();
  }
  const output = new Output({
    format:
      s.format === "mp4"
        ? new Mp4OutputFormat({ fastStart: "reserve" })
        : new WebMOutputFormat(),
    target,
  });
  const video = new CanvasSource(canvas, { codec, bitrate: s.bitrate });
  output.addVideoTrack(video, {
    frameRate: s.fps,
    maximumPacketCount: frames + 4,
  });
  let audio: NativeAudioTrack | undefined;
  if (hasAudio) {
    audio = await NativeAudioTrack.create(output, total, audioCodec);
  }
  try {
    await output.start();
    let nextAudio = 0;
    for (let i = 0; i < frames; i++) {
      if (canceled) throw new Error("Export canceled");
      const t = i / s.fps;
      r.draw(await session.layers(p, t), p);
      await video.add(t, Math.min(1 / s.fps, total - t));
      if (audio && (t >= nextAudio || i === frames - 1)) {
        const count = Math.min(
          48000,
          Math.max(0, Math.round((total - nextAudio) * 48000)),
        );
        if (count) {
          const channels = await audioMixer.mix(p, nextAudio, count);
          const data = new Float32Array(count * 2);
          data.set(channels[0]);
          data.set(channels[1], count);
          const sample = new AudioSample({
            data,
            format: "f32-planar",
            numberOfChannels: 2,
            sampleRate: 48000,
            timestamp: nextAudio,
          });
          await audio.add(sample);
          sample.close();
          nextAudio += count / 48000;
        }
      }
      if (i % 10 === 0 || i === frames - 1)
        postMessage({
          type: "export-progress",
          id,
          progress: (i + 1) / frames,
          frames: i + 1,
          fps: (i + 1) / ((performance.now() - started) / 1000),
        });
    }
    video.close();
    await audio?.finish();
    await output.finalize();
    const blob = handle
      ? await handle.getFile()
      : new Blob([(target as BufferTarget).buffer!], {
          type: s.format === "mp4" ? "video/mp4" : "video/webm",
        });
    return {
      blob,
      seconds: (performance.now() - started) / 1000,
      frames,
      fps: frames / ((performance.now() - started) / 1000),
      renderer: r.name,
      audioPrimingCorrectionMs: (audio?.delay || 0) * 1000,
      storage: handle ? "OPFS" : "memory",
    };
  } catch (e) {
    await output.cancel();
    throw e;
  } finally {
    audio?.abort();
    r.dispose();
    await session.dispose();
    await audioMixer.dispose();
  }
}
self.onmessage = async (event: MessageEvent) => {
  const m = event.data;
  try {
    if (m.type === "file") {
      files.set(m.assetId, m.file);
      if (m.id) respond(m.id, true);
    }
    if (m.type === "probe") respond(m.id, await probeFile(m.file));
    if (m.type === "init") {
      renderer = await makeRenderer(m.canvas, m.gpu !== false);
      respond(m.id, { renderer: renderer.name });
    }
    if (m.type === "project") {
      project = m.project;
      respond(m.id, true);
    }
    if (m.type === "resize" && renderer) {
      renderer.canvas.width = m.width;
      renderer.canvas.height = m.height;
      respond(m.id, true);
    }
    if (m.type === "draw") {
      if (pending) respond(pending.id, { skipped: true });
      pending = { id: m.id, time: m.time };
      void drain();
    }
    if (m.type === "waveform") {
      const data = await analyzeWaveform(m.file, m.duration, (time) =>
        postMessage({ type: "waveform-progress", assetId: m.assetId, time }),
      );
      postMessage(
        { id: m.id, data },
        { transfer: [data.peaks.buffer as ArrayBuffer] },
      );
    }
    if (m.type === "audio")
      respond(m.id, await mixer.mix(m.project, m.start, m.count, m.rate));
    if (m.type === "reset-audio") {
      await mixer.dispose();
      mixer = new AudioMixer();
      respond(m.id, true);
    }
    if (m.type === "export")
      respond(m.id, await exportVideo(m.project, m.settings, m.id));
    if (m.type === "cancel") canceled = true;
    if (m.type === "snapshot" && renderer) {
      respond(
        m.id,
        await blobData(
          await renderer.canvas.convertToBlob({ type: "image/png" }),
        ),
      );
    }
    if (m.type === "dispose") {
      await media.dispose();
      await mixer.dispose();
      renderer?.dispose();
      respond(m.id, true);
    }
  } catch (e) {
    fail(m.id, e);
  }
};
