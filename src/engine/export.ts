import { useSyncExternalStore } from "react";
import { WorkerClient, assetFiles } from "./client";
import type { Project } from "../core/model";
import type { ExportSettings } from "../workers/media.worker";
export type ExportState = {
  id: string;
  status: "idle" | "rendering" | "complete" | "error" | "canceled";
  progress: number;
  fps: number;
  frames: number;
  error: string;
  blob?: Blob;
  url?: string;
  seconds?: number;
  renderer?: string;
  audioPrimingCorrectionMs?: number;
  storage?: "OPFS" | "memory";
  settings?: ExportSettings;
};
let state: ExportState = {
  id: "",
  status: "idle",
  progress: 0,
  fps: 0,
  frames: 0,
  error: "",
};
let worker: WorkerClient | undefined;
const listeners = new Set<() => void>();
const update = (patch: Partial<ExportState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
export const exports = {
  get: () => state,
  subscribe: (fn: () => void) => {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  start: (project: Project, settings: ExportSettings) => {
    if (state.status === "rendering")
      throw new Error("An export is already in progress");
    if (state.url) URL.revokeObjectURL(state.url);
    const id = crypto.randomUUID();
    update({
      id,
      status: "rendering",
      progress: 0,
      fps: 0,
      frames: 0,
      error: "",
      blob: undefined,
      url: undefined,
      settings,
    });
    const activeWorker = new WorkerClient();
    worker = activeWorker;
    for (const [id, file] of assetFiles) activeWorker.file(id, file);
    activeWorker.onProgress = (m) => {
      if (state.id === id)
        update({ progress: m.progress, fps: m.fps, frames: m.frames });
    };
    activeWorker
      .call("export", { project: structuredClone(project), settings })
      .then((result) => {
        if (state.id !== id) {
          activeWorker.terminate();
          return;
        }
        update({
          status: "complete",
          progress: 1,
          ...result,
          url: URL.createObjectURL(result.blob),
        });
        activeWorker.terminate();
        worker = undefined;
      })
      .catch((e) => {
        if (state.id !== id) {
          activeWorker.terminate();
          return;
        }
        update({
          status: state.status === "canceled" ? "canceled" : "error",
          error: e.message,
        });
        activeWorker.terminate();
        worker = undefined;
      });
    return id;
  },
  cancel: () => {
    worker?.worker.postMessage({ type: "cancel" });
    worker?.terminate();
    worker = undefined;
    update({ status: "canceled", error: "Export canceled" });
  },
  reset: () => {
    if (state.status === "rendering") exports.cancel();
    if (state.url) URL.revokeObjectURL(state.url);
    update({ status: "idle", url: undefined, blob: undefined });
  },
};
export const useExport = () =>
  useSyncExternalStore(exports.subscribe, exports.get);
