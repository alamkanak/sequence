import type { Asset } from "./model";
import { get, put } from "./storage";
import { WorkerClient } from "../engine/client";
import { Waveform, type WaveformData } from "../engine/waveform";
interface Entry {
  key: string;
  status: "queued" | "analyzing" | "ready" | "error";
  progress: number;
  waveform?: Waveform;
}
const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
let queue = Promise.resolve(),
  client: WorkerClient | undefined;
export const waveformEntry = (id: string) => entries.get(id);
export function subscribeWaveforms(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
/** Derived cache never enters project history or playback/export messages. */
export function prepareWaveform(asset: Asset, file: File) {
  if (!asset.hasAudio) return;
  const key = `${file.size}:${file.lastModified}:${asset.duration}:2`;
  if (entries.get(asset.id)?.key === key) return;
  const entry: Entry = { key, status: "queued", progress: 0 };
  entries.set(asset.id, entry);
  emit();
  queue = queue.then(async () => {
    try {
      const cacheKey = `waveform-v2:${asset.id}`;
      const cached = await get<{ key: string; data: WaveformData }>(
        "files",
        cacheKey,
      ).catch(() => undefined);
      let data: WaveformData;
      if (
        cached?.key === key &&
        cached.data.version === 2 &&
        cached.data.peaks instanceof Float32Array
      ) {
        data = cached.data;
      } else {
        entry.status = "analyzing";
        emit();
        client ??= new WorkerClient();
        client.onProgress = (m) => {
          if (m.type === "waveform-progress" && m.assetId === asset.id) {
            entry.progress = Math.max(0, Math.min(1, m.time / asset.duration));
            emit();
          }
        };
        data = await client.call("waveform", {
          assetId: asset.id,
          file,
          duration: asset.duration,
        });
        void put("files", cacheKey, { key, data }).catch(() => {});
      }
      entry.waveform = new Waveform(data);
      entry.status = "ready";
      entry.progress = 1;
    } catch {
      entry.status = "error";
    }
    emit();
  });
}
