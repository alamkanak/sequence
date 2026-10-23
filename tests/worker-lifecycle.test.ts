import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PreviewEngine, WorkerClient } from "../src/engine/client";
import { emptyProject } from "../src/core/model";
class ControlledWorker {
  onmessage?: (event: { data: unknown }) => void;
  onerror?: (event: { message: string }) => void;
  messages: { id: number; type: string }[] = [];
  stopped = false;
  postMessage(message: { id: number; type: string }) {
    this.messages.push(message);
  }
  terminate() {
    this.stopped = true;
  }
  respond(data: unknown, type: string) {
    const request = this.messages.find((m) => m.type === type)!;
    this.onmessage?.({ data: { id: request.id, data } });
  }
}
const canvas = () =>
  ({ transferControlToOffscreen: () => ({}) }) as unknown as HTMLCanvasElement;
beforeEach(() => vi.stubGlobal("Worker", ControlledWorker));
afterEach(() => vi.unstubAllGlobals());
describe("preview worker navigation lifecycle", () => {
  it("rejects requests after shutdown immediately instead of leaving them pending", async () => {
    const client = new WorkerClient();
    client.terminate();
    await expect(client.call("draw")).rejects.toThrow("Worker stopped");
    expect(client.requests.size).toBe(0);
  });
  it("handles shutdown during initialization without unhandled observer rejections", async () => {
    const engine = new PreviewEngine(canvas());
    const pending = engine.setProject(emptyProject());
    engine.dispose();
    await expect(pending).rejects.toThrow("Worker stopped");
    await expect(engine.draw(0, true)).resolves.toBeUndefined();
    expect(engine.client.requests.size).toBe(0);
  });
  it("cancels pending drawing and queued redraws on disposal, but reports real failures", async () => {
    const engine = new PreviewEngine(canvas());
    const worker = engine.client.worker as unknown as ControlledWorker;
    worker.respond({ renderer: "canvas2d" }, "init");
    await engine.ready;
    engine.project = emptyProject();
    const drawing = engine.draw(0, true);
    await Promise.resolve();
    await engine.draw(1, true);
    expect(engine.pendingForce).toBe(1);
    engine.dispose();
    await expect(drawing).resolves.toBeUndefined();
    expect(engine.pendingForce).toBeUndefined();
    expect(worker.messages.filter((m) => m.type === "draw")).toHaveLength(1);
    const active = new PreviewEngine(canvas());
    (active.client.worker as unknown as ControlledWorker).respond(
      { renderer: "canvas2d" },
      "init",
    );
    await active.ready;
    active.project = emptyProject();
    const failed = active.draw(0);
    await Promise.resolve();
    active.client.worker.onerror!({ message: "Decode failed" } as ErrorEvent);
    await expect(failed).rejects.toThrow("Decode failed");
    active.dispose();
  });
});
