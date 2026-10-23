import { beforeEach, describe, it, expect } from "vitest";
import { store } from "../src/core/store";
import { emptyProject, newClip, type Asset } from "../src/core/model";
import { TimelineClipboard } from "../src/core/clipboard";
beforeEach(() => {
  store.replace(emptyProject(), false);
  store.clearHistory();
});
describe("transaction and history boundaries", () => {
  it("undoes a pasted clip and its new destination track together", () => {
    const p = emptyProject();
    p.tracks.forEach((t) => {
      t.locked = true;
    });
    const clipboard = new TimelineClipboard();
    clipboard.copy(newClip(p, "text", p.tracks[0].id));
    store.replace(p, false);
    store.clearHistory();
    store.apply(clipboard.paste(p, 3)!.edits);
    expect(store.get().project.tracks).toHaveLength(p.tracks.length + 1);
    expect(store.get().project.clips).toHaveLength(1);
    store.undo();
    expect(store.get().project.tracks).toEqual(p.tracks);
    expect(store.get().project.clips).toHaveLength(0);
    store.redo();
    expect(store.get().project.clips[0].start).toBe(3);
  });
  it("restores removed media and every timeline use in one undo, then redoes removal", () => {
    const p = emptyProject();
    const asset: Asset = {
      id: "audio",
      name: "music.wav",
      kind: "audio",
      duration: 10,
      width: 0,
      height: 0,
      fps: 30,
      hasAudio: true,
      hdr: false,
      size: 10,
      type: "audio/wav",
    };
    p.assets = [asset];
    p.clips = [newClip(p, "audio", p.tracks[2].id, 0, asset)];
    store.replace(p, false);
    store.clearHistory();
    store.apply([{ op: "delete_asset", id: asset.id }]);
    expect(store.get().project.assets).toHaveLength(0);
    expect(store.get().project.clips).toHaveLength(0);
    store.undo();
    expect(store.get().project.assets).toEqual(p.assets);
    expect(store.get().project.clips).toEqual(p.clips);
    store.redo();
    expect(store.get().project.assets).toHaveLength(0);
    expect(store.get().project.clips).toHaveLength(0);
  });
  it("rejects an invalid batch without partially changing the project or history", () => {
    const before = store.get().project;
    expect(() =>
      store.apply([
        { op: "project", patch: { name: "Should not apply" } },
        { op: "update_clip", id: "missing", patch: { start: 1 } },
      ]),
    ).toThrow("Clip not found");
    expect(store.get().project).toBe(before);
    expect(store.canUndo()).toBe(false);
  });
  it("restores a replaced project in one undo after grouped imports/building", () => {
    const original = store.get().project;
    const finish = store.beginHistoryGroup();
    store.replace(emptyProject());
    const p = store.get().project;
    store.apply([
      { op: "add_clip", clip: newClip(p, "text", p.tracks[0].id, 0) },
    ]);
    finish();
    const revision = store.get().project.revision;
    store.undo();
    expect(store.get().project.id).toBe(original.id);
    expect(store.get().project.clips).toHaveLength(0);
    expect(store.get().project.revision).toBeGreaterThan(revision);
    store.redo();
    expect(store.get().project.clips).toHaveLength(1);
  });
});
