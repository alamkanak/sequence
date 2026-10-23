import type { Asset, Project } from "../core/model";
import { meter } from "../core/performance";
export class WorkerClient {
  worker: Worker;
  counter = 0;
  stopped = false;
  requests = new Map<
    number,
    { resolve: (v: any) => void; reject: (e: Error) => void }
  >();
  onProgress?: (data: any) => void;
  constructor() {
    this.worker = new Worker(
      new URL("../workers/media.worker.ts", import.meta.url),
      { type: "module" },
    );
    this.worker.onmessage = (event) => {
      const m = event.data;
      if (m.type === "gpu-lost") {
        this.onProgress?.(m);
        return;
      }
      if (m.type === "export-progress" || m.type === "waveform-progress") {
        this.onProgress?.(m);
        return;
      }
      const req = this.requests.get(m.id);
      if (req) {
        this.requests.delete(m.id);
        if (m.error) req.reject(new Error(m.error));
        else req.resolve(m.data);
      }
    };
    this.worker.onerror = (e) => {
      for (const req of this.requests.values())
        req.reject(new Error(e.message || "Media worker failed"));
      this.requests.clear();
    };
  }
  call(
    type: string,
    data: Record<string, unknown> = {},
    transfer: Transferable[] = [],
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.stopped) {
        reject(new Error("Worker stopped"));
        return;
      }
      const id = ++this.counter;
      this.requests.set(id, { resolve, reject });
      this.worker.postMessage({ type, id, ...data }, transfer);
    });
  }
  file(assetId: string, file: File) {
    this.worker.postMessage({ type: "file", assetId, file });
  }
  terminate() {
    this.stopped = true;
    this.worker.terminate();
    for (const r of this.requests.values())
      r.reject(new Error("Worker stopped"));
    this.requests.clear();
  }
}
export const assetFiles = new Map<string, File>();
let probe: WorkerClient | undefined;
export async function inspectMedia(file: File): Promise<Asset> {
  probe ??= new WorkerClient();
  return probe.call("probe", { file });
}
export class PreviewEngine {
  client = new WorkerClient();
  audioClient = new WorkerClient();
  ready: Promise<any>;
  project?: Project;
  busy = false;
  lastDraw = -1;
  lastRevision = -1;
  pendingForce: number | undefined;
  disposed = false;
  constructor(canvas: HTMLCanvasElement) {
    const offscreen = canvas.transferControlToOffscreen();
    this.ready = this.client.call("init", { canvas: offscreen }, [offscreen]);
    // Consumers handle initialization failures; this observer must not create
    // an unhandled rejected promise when navigation cancels initialization.
    void this.ready
      .then((r) => {
        if (!this.disposed) meter.renderer = r.renderer;
      })
      .catch(() => {});
    for (const [id, file] of assetFiles) {
      this.client.file(id, file);
      this.audioClient.file(id, file);
    }
  }
  setFile(id: string, file: File) {
    this.client.file(id, file);
    this.audioClient.file(id, file);
  }
  async setProject(p: Project) {
    this.project = p;
    await this.ready;
    if (this.disposed) return;
    await this.client.call("project", { project: p });
    this.lastRevision = -1;
  }
  async resize(w: number, h: number) {
    await this.ready;
    if (this.disposed) return;
    await this.client.call("resize", { width: w, height: h });
    this.lastRevision = -1;
  }
  async draw(t: number, force = false) {
    if (this.disposed) return;
    if (this.busy) {
      if (force) this.pendingForce = t;
      meter.skipped++;
      return;
    }
    if (!this.project) return;
    const frame = Math.floor(t * this.project.fps);
    if (
      !force &&
      frame === this.lastDraw &&
      this.lastRevision === this.project.revision
    )
      return;
    this.busy = true;
    try {
      await this.ready;
      if (this.disposed) return;
      const r = await this.client.call("draw", { time: t });
      if (!r.skipped) {
        meter.renders++;
        meter.renderMs = r.ms;
        meter.renderer = r.renderer;
        meter.decoded = r.decoded;
        meter.cacheBytes = r.cacheBytes || 0;
        this.lastDraw = frame;
        this.lastRevision = this.project.revision;
      }
    } catch (error) {
      if (!this.disposed) throw error;
    } finally {
      this.busy = false;
      if (!this.disposed && this.pendingForce !== undefined) {
        const next = this.pendingForce;
        this.pendingForce = undefined;
        void this.draw(next, true).catch(() => {});
      }
    }
  }
  dispose() {
    this.disposed = true;
    this.pendingForce = undefined;
    this.client.terminate();
    this.audioClient.terminate();
  }
}
