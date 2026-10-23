import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyProject, newClip, type Asset } from "../src/core/model";
import { store } from "../src/core/store";
import { assetFiles, inspectMedia } from "../src/engine/client";
import { put } from "../src/core/storage";
import { transport } from "../src/engine/transport";
import { importFiles, relinkAsset, relinkFiles } from "../src/core/actions";

vi.mock("../src/engine/client", () => ({
  assetFiles: new Map<string, File>(),
  inspectMedia: vi.fn(),
}));
vi.mock("../src/core/storage", () => ({
  get: vi.fn(),
  put: vi.fn(),
  saveProject: vi.fn(),
}));
vi.mock("../src/core/waveforms", () => ({ prepareWaveform: vi.fn() }));
vi.mock("../src/engine/transport", () => ({
  transport: {
    pause: vi.fn(),
    seek: vi.fn(),
    time: 2,
    engine: { setFile: vi.fn() },
  },
}));

const original: Asset = {
  id: "source",
  name: "original.mp4",
  kind: "video",
  size: 4,
  type: "video/mp4",
  duration: 10,
  fps: 30,
  width: 720,
  height: 1280,
  hasAudio: true,
  hdr: false,
};
const file = (name = original.name) =>
  new File(["data"], name, { type: "video/mp4" });

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetAllMocks();
  assetFiles.clear();
  const p = emptyProject();
  p.assets = [{ ...original }];
  const clip = newClip(p, "video", p.tracks[1].id, 3, original);
  Object.assign(clip, {
    in: 2,
    duration: 3,
    speed: 2,
    volume: 0.4,
    rotation: 15,
  });
  p.clips = [clip];
  store.replace(p, false);
  store.clearHistory();
  store.patch({ error: "", selected: clip.id });
  vi.mocked(inspectMedia).mockResolvedValue({
    ...original,
    id: "probe-id",
    name: "renamed.mp4",
  });
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("missing media recovery", () => {
  it("reimport refreshes the project and both workers without duplicating or altering clips", async () => {
    const before = structuredClone(store.get().project);
    const media = file();
    const notify = vi.fn();
    const unsubscribe = store.subscribe(notify);
    await importFiles([media]);
    unsubscribe();
    expect(store.get().project.assets).toEqual(before.assets);
    expect(store.get().project.clips).toEqual(before.clips);
    expect(store.get().project.revision).toBeGreaterThan(before.revision);
    expect(assetFiles.get(original.id)).toBe(media);
    expect(transport.engine!.setFile).toHaveBeenCalledWith(original.id, media);
    expect(transport.seek).toHaveBeenCalledWith(2);
    expect(notify).toHaveBeenCalled();
    expect(put).toHaveBeenCalledWith("files", original.id, media);
    expect(inspectMedia).not.toHaveBeenCalled();
    expect(store.canUndo()).toBe(false);
  });

  it("explicitly relinks a renamed file with the same asset ID and preserves edits and redo", async () => {
    store.apply([{ op: "project", patch: { name: "Changed" } }]);
    store.undo();
    const before = structuredClone(store.get().project);
    await relinkAsset(original.id, file("renamed.mp4"));
    expect(store.get().project.assets).toHaveLength(1);
    expect(store.get().project.assets[0]).toMatchObject({
      id: original.id,
      name: "renamed.mp4",
    });
    expect(store.get().project.clips).toEqual(before.clips);
    expect(store.canRedo()).toBe(true);
    expect(store.get().selected).toBe(before.clips[0].id);
  });

  it("rejects incompatible or too-short media using source offsets and speed", async () => {
    vi.mocked(inspectMedia).mockResolvedValueOnce({
      ...original,
      kind: "audio",
    });
    await expect(relinkAsset(original.id, file())).rejects.toThrow(
      "Choose a video file",
    );
    vi.mocked(inspectMedia).mockResolvedValueOnce({ ...original, duration: 7 });
    await expect(relinkAsset(original.id, file())).rejects.toThrow(
      "8.0s needed",
    );
    expect(assetFiles.size).toBe(0);
    expect(put).not.toHaveBeenCalled();
  });

  it("never attaches a probed file to a different project", async () => {
    vi.mocked(inspectMedia).mockImplementationOnce(async () => {
      store.replace(emptyProject());
      return original;
    });
    await expect(relinkAsset(original.id, file())).rejects.toThrow(
      "project changed",
    );
    expect(assetFiles.size).toBe(0);
  });

  it("bulk relink restores matching references and reports unmatched selections without importing them", async () => {
    const p = store.get().project;
    store.patch({
      project: {
        ...p,
        assets: [...p.assets, { ...original, id: "duplicate" }],
      },
    });
    const result = await relinkFiles([file(), file("other.mp4")]);
    expect(result).toEqual({ linked: 2, unmatched: ["other.mp4"] });
    expect(assetFiles.has("source")).toBe(true);
    expect(assetFiles.has("duplicate")).toBe(true);
    expect(store.get().project.assets).toHaveLength(2);
  });

  it("keeps same-name files of a different size and ambiguous candidates unlinked", async () => {
    const wrong = new File(["different"], original.name);
    expect((await relinkFiles([wrong])).linked).toBe(0);
    expect((await relinkFiles([file(), file()])).linked).toBe(0);
    expect(assetFiles.size).toBe(0);
  });

  it("restores session access even when browser persistence fails", async () => {
    vi.mocked(put).mockRejectedValueOnce(new Error("Quota exceeded"));
    await expect(
      relinkAsset(original.id, file("renamed.mp4")),
    ).resolves.toBeUndefined();
    expect(assetFiles.has(original.id)).toBe(true);
    expect(store.get().error).toContain("available for this session");
    expect(store.get().project.assets[0].id).toBe(original.id);
  });
});
