import {
  Input,
  ALL_FORMATS,
  BlobSource,
  VideoSampleSink,
  AudioSampleSink,
  type VideoSample,
  type AudioSample,
} from "mediabunny";
import { audioGain } from "../core/audio-envelope";
import { PeakBuilder } from "./waveform";
import { uid, type Asset, type Project } from "../core/model";
import { activeClips, elementPicture, pose, type Layer } from "./scene";
export const files = new Map<string, File>();
export async function probeFile(file: File): Promise<Asset> {
  const asset: Asset = {
    id: uid(),
    name: file.name,
    kind: file.type.startsWith("image/")
      ? file.type === "image/gif"
        ? "gif"
        : "image"
      : "video",
    duration: 0,
    width: 0,
    height: 0,
    fps: 30,
    hasAudio: false,
    hdr: false,
    size: file.size,
    type: file.type,
  };
  if (asset.kind === "gif" && !("ImageDecoder" in globalThis))
    throw new Error(
      "Animated GIF decoding is unavailable in this browser. Convert to MP4 or use desktop Chrome.",
    );
  if (
    file.type === "image/svg+xml" &&
    /<(?:animate|set|script|foreignObject)\b/i.test(await file.text())
  )
    throw new Error(
      "This SVG contains unsupported animation or embedded content. Use static SVG or the animated element adapters.",
    );
  if (asset.kind === "image" || asset.kind === "gif") {
    const image = await createImageBitmap(file);
    asset.width = image.width;
    asset.height = image.height;
    const c = new OffscreenCanvas(
      240,
      Math.round((240 * image.height) / image.width),
    );
    c.getContext("2d")!.drawImage(image, 0, 0, c.width, c.height);
    image.close();
    asset.thumbnail = await blobData(
      await c.convertToBlob({ type: "image/jpeg", quality: 0.7 }),
    );
    asset.duration = 5;
    return asset;
  }
  const input = new Input({
    source: new BlobSource(file),
    formats: ALL_FORMATS,
  });
  try {
    const video = await input.getPrimaryVideoTrack(),
      audio = await input.getPrimaryAudioTrack();
    asset.duration = await input.computeDuration();
    if (!Number.isFinite(asset.duration) || asset.duration <= 0)
      throw new Error("Cannot read media duration");
    asset.hasAudio = !!audio;
    if (video) {
      if (!(await video.canDecode()))
        throw new Error(
          "This browser cannot decode the video codec. Try H.264 MP4.",
        );
      asset.width = await video.getDisplayWidth();
      asset.height = await video.getDisplayHeight();
      asset.hdr = await video.hasHighDynamicRange();
      const stats = await video.computePacketStats(100);
      asset.fps = stats.averagePacketRate || 30;
      const sample = await new VideoSampleSink(video).getSample(0);
      if (sample) {
        const canvas = new OffscreenCanvas(
          240,
          Math.max(1, Math.round((240 * asset.height) / asset.width)),
        );
        sample.draw(
          canvas.getContext("2d")!,
          0,
          0,
          canvas.width,
          canvas.height,
        );
        sample.close();
        asset.thumbnail = await blobData(
          await canvas.convertToBlob({ type: "image/jpeg", quality: 0.7 }),
        );
      }
    } else {
      if (!audio || !(await audio.canDecode()))
        throw new Error("No supported audio/video track in this file");
      asset.kind = "audio";
      asset.fps = 0;
    }
    return asset;
  } finally {
    input.dispose();
  }
}
/** Decode the entire track in the analysis worker; never use packet counts as time. */
export async function analyzeWaveform(
  file: File,
  duration: number,
  progress: (time: number) => void,
) {
  const input = new Input({
    source: new BlobSource(file),
    formats: ALL_FORMATS,
  });
  try {
    const track = await input.getPrimaryAudioTrack();
    if (!track || !(await track.canDecode()))
      throw new Error("Audio waveform decoding is unavailable");
    const builder = new PeakBuilder(duration);
    let last = 0;
    for await (const sample of new AudioSampleSink(track).samples()) {
      try {
        const channels = Array.from(
          { length: sample.numberOfChannels },
          (_, planeIndex) => {
            const pcm = new Float32Array(sample.numberOfFrames);
            sample.copyTo(pcm, { planeIndex, format: "f32-planar" });
            return pcm;
          },
        );
        builder.add(channels, sample.timestamp, sample.sampleRate);
        if (performance.now() - last > 250) {
          progress(sample.timestamp + sample.duration);
          last = performance.now();
        }
      } finally {
        sample.close();
      }
    }
    return builder.data;
  } finally {
    input.dispose();
  }
}
export async function blobData(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let result = "";
  for (const b of bytes) result += String.fromCharCode(b);
  return `data:${blob.type};base64,${btoa(result)}`;
}
interface VideoCursor {
  input: Input;
  sink: VideoSampleSink;
  iterator?: AsyncGenerator<VideoSample, void, unknown>;
  current?: VideoSample;
  next?: VideoSample;
  last: number;
}
export class MediaSession {
  cursors = new Map<string, VideoCursor>();
  images = new Map<string, ImageBitmap>();
  gifs = new Map<
    string,
    {
      decoder: any;
      durations: number[];
      duration: number;
      cached?: ImageBitmap;
      index: number;
    }
  >();
  decoded = 0;
  async picture(asset: Asset, key: string, time: number) {
    const file = files.get(asset.id);
    if (!file) throw new Error(`Relink missing media: ${asset.name}`);
    if (asset.kind === "gif" && "ImageDecoder" in globalThis) {
      let entry = this.gifs.get(asset.id);
      if (!entry) {
        const decoder = new (globalThis as any).ImageDecoder({
          data: await file.arrayBuffer(),
          type: "image/gif",
        });
        await decoder.tracks.ready;
        await decoder.completed;
        const track = decoder.tracks.selectedTrack;
        const durations: number[] = [];
        for (let i = 0; i < track.frameCount; i++) {
          const { image } = await decoder.decode({ frameIndex: i });
          durations.push((image.duration || 100000) / 1e6);
          image.close();
        }
        entry = {
          decoder,
          durations,
          duration: durations.reduce((a, b) => a + b, 0),
          index: -1,
        };
        this.gifs.set(asset.id, entry);
      }
      let t = time % entry.duration,
        index = 0;
      while (index < entry.durations.length - 1 && t >= entry.durations[index])
        t -= entry.durations[index++];
      if (index !== entry.index) {
        const { image } = await entry.decoder.decode({ frameIndex: index });
        entry.cached?.close();
        entry.cached = await createImageBitmap(image);
        image.close();
        entry.index = index;
      }
      return entry.cached!;
    }
    if (asset.kind === "image" || asset.kind === "gif") {
      if (!this.images.has(asset.id))
        this.images.set(asset.id, await createImageBitmap(file));
      return this.images.get(asset.id)!;
    }
    let c = this.cursors.get(key);
    if (!c) {
      const input = new Input({
        source: new BlobSource(file),
        formats: ALL_FORMATS,
      });
      const track = await input.getPrimaryVideoTrack();
      if (!track) throw new Error("Missing video track");
      c = { input, sink: new VideoSampleSink(track), last: -1 };
      this.cursors.set(key, c);
    }
    if (!c.iterator || time < c.last - 0.001 || time - c.last > 0.8) {
      await c.iterator?.return();
      c.current?.close();
      c.next?.close();
      c.current = undefined;
      c.next = undefined;
      c.iterator = c.sink.samples(time);
      const first = await c.iterator.next();
      if (first.value) c.current = first.value;
      const second = await c.iterator.next();
      if (second.value) c.next = second.value;
      this.decoded += 2;
    }
    while (c.next && c.next.timestamp <= time + 1e-6) {
      c.current?.close();
      c.current = c.next;
      const next = await c.iterator!.next();
      c.next = next.value || undefined;
      this.decoded++;
    }
    c.last = time;
    return c.current;
  }
  async layers(p: Project, t: number): Promise<Layer[]> {
    const active = activeClips(p, t);
    const keys = new Set(active.map((c) => c.id));
    for (const [key, c] of this.cursors)
      if (!keys.has(key)) {
        await c.iterator?.return();
        c.current?.close();
        c.next?.close();
        c.input.dispose();
        this.cursors.delete(key);
      }
    const layers = await Promise.all(
      active.map(async (c) => {
        const a = p.assets.find((a) => a.id === c.assetId);
        const picture = a
          ? await this.picture(a, c.id, c.in + (t - c.start) * c.speed)
          : elementPicture(c, p, t - c.start);
        return picture ? { clip: c, pose: pose(c, p, t), picture } : undefined;
      }),
    );
    return layers.filter(Boolean) as Layer[];
  }
  async dispose() {
    for (const c of this.cursors.values()) {
      await c.iterator?.return();
      c.current?.close();
      c.next?.close();
      c.input.dispose();
    }
    this.cursors.clear();
    this.images.forEach((i) => i.close());
    this.images.clear();
    this.gifs.forEach((g) => {
      g.cached?.close();
      g.decoder.close();
    });
    this.gifs.clear();
  }
}
interface Pcm {
  timestamp: number;
  rate: number;
  channels: Float32Array[];
  duration: number;
}
interface AudioCursor {
  input: Input;
  iterator: AsyncGenerator<AudioSample, void, unknown>;
  blocks: Pcm[];
  last: number;
  ended: boolean;
}
export class AudioMixer {
  cursors = new Map<string, AudioCursor>();
  async mix(p: Project, start: number, count: number, rate = 48000) {
    const output = [new Float32Array(count), new Float32Array(count)];
    const end = start + count / rate;
    for (const clip of p.clips) {
      const asset = p.assets.find((a) => a.id === clip.assetId);
      if (
        !asset?.hasAudio ||
        p.tracks.find((t) => t.id === clip.trackId)?.muted ||
        (!clip.volume && !clip.volumeKeyframes.some((k) => k.value > 0)) ||
        clip.start >= end ||
        clip.start + clip.duration <= start
      )
        continue;
      const file = files.get(asset.id);
      if (!file) throw new Error(`Relink missing audio: ${asset.name}`);
      const a = Math.max(start, clip.start),
        b = Math.min(end, clip.start + clip.duration);
      const sourceStart = clip.in + (a - clip.start) * clip.speed,
        sourceEnd = clip.in + (b - clip.start) * clip.speed;
      let cursor = this.cursors.get(clip.id);
      if (
        cursor &&
        (sourceStart < cursor.last - 0.001 || sourceStart - cursor.last > 1)
      ) {
        await cursor.iterator.return();
        cursor.input.dispose();
        this.cursors.delete(clip.id);
        cursor = undefined;
      }
      if (!cursor) {
        const input = new Input({
          source: new BlobSource(file),
          formats: ALL_FORMATS,
        });
        const track = await input.getPrimaryAudioTrack();
        if (!track) {
          input.dispose();
          continue;
        }
        cursor = {
          input,
          iterator: new AudioSampleSink(track).samples(sourceStart),
          blocks: [],
          last: sourceStart,
          ended: false,
        };
        this.cursors.set(clip.id, cursor);
      }
      while (
        !cursor.ended &&
        (!cursor.blocks.length ||
          cursor.blocks.at(-1)!.timestamp + cursor.blocks.at(-1)!.duration <
            sourceEnd)
      ) {
        const item = await cursor.iterator.next();
        if (!item.value) {
          cursor.ended = true;
          break;
        }
        const s = item.value;
        const channels = Array.from(
          { length: Math.min(2, s.numberOfChannels) },
          (_, i) => {
            const data = new Float32Array(s.numberOfFrames);
            s.copyTo(data, { planeIndex: i, format: "f32-planar" });
            return data;
          },
        );
        cursor.blocks.push({
          timestamp: s.timestamp,
          rate: s.sampleRate,
          channels,
          duration: s.duration,
        });
        s.close();
      }
      let bi = 0;
      for (
        let i = Math.max(0, Math.ceil((a - start) * rate));
        i < Math.min(count, Math.ceil((b - start) * rate));
        i++
      ) {
        const t = start + i / rate,
          st = clip.in + (t - clip.start) * clip.speed;
        while (
          bi < cursor.blocks.length - 1 &&
          cursor.blocks[bi].timestamp + cursor.blocks[bi].duration <= st
        )
          bi++;
        const block = cursor.blocks[bi];
        if (!block) break;
        const sample = (st - block.timestamp) * block.rate;
        const n = Math.floor(sample),
          f = sample - n;
        if (n < 0 || n >= block.channels[0].length) continue;
        const gain = audioGain(clip, t - clip.start);
        for (let ch = 0; ch < 2; ch++) {
          const data = block.channels[Math.min(ch, block.channels.length - 1)];
          output[ch][i] +=
            (data[n] * (1 - f) +
              (data[Math.min(n + 1, data.length - 1)] || 0) * f) *
            gain;
        }
      }
      cursor.last = sourceEnd;
      cursor.blocks = cursor.blocks.filter(
        (b) => b.timestamp + b.duration >= sourceEnd - 0.1,
      );
    }
    for (const arr of output)
      for (let i = 0; i < arr.length; i++)
        arr[i] = Math.max(-1, Math.min(1, arr[i]));
    return output;
  }
  async dispose() {
    for (const c of this.cursors.values()) {
      await c.iterator.return();
      c.input.dispose();
    }
    this.cursors.clear();
  }
}
