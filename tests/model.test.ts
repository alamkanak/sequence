import { describe, it, expect } from "vitest";
import {
  emptyProject,
  newClip,
  editProject,
  validateProject,
  snapTime,
  type Asset,
} from "../src/core/model";
import { pose, corners } from "../src/engine/scene";
const asset: Asset = {
  id: "source",
  name: "source.mp4",
  kind: "video",
  duration: 20,
  width: 1920,
  height: 1080,
  fps: 30,
  hasAudio: true,
  hdr: false,
  size: 10,
  type: "video/mp4",
};
function fixture() {
  const p = emptyProject();
  p.assets = [asset];
  const c = newClip(p, "video", p.tracks[1].id, 0, asset);
  c.duration = 10;
  p.clips = [c];
  return { p, c };
}
describe("editing commands", () => {
  it("removes media and all its uses atomically while preserving other media and timing", () => {
    const { p, c } = fixture();
    p.assets.push({ ...asset, id: "other" });
    p.clips.push({ ...c, id: "second-use", start: 12, duration: 4 });
    p.clips.push({
      ...c,
      id: "unrelated",
      assetId: "other",
      start: 17,
      duration: 2,
    });
    const next = editProject(p, [{ op: "delete_asset", id: asset.id }]);
    expect(next.assets.map((a) => a.id)).toEqual(["other"]);
    expect(next.clips.map((c) => c.id)).toEqual(["unrelated"]);
    expect(next.clips[0].start).toBe(17);
    expect(p.assets).toHaveLength(2);
    expect(p.clips).toHaveLength(3);
  });
  it("removes unused media and rejects missing media or uses on locked tracks", () => {
    const { p } = fixture();
    p.clips = [];
    expect(
      editProject(p, [{ op: "delete_asset", id: asset.id }]).assets,
    ).toHaveLength(0);
    expect(() =>
      editProject(p, [{ op: "delete_asset", id: "missing" }]),
    ).toThrow("Media not found");
    const locked = fixture().p;
    locked.tracks[1].locked = true;
    expect(() =>
      editProject(locked, [{ op: "delete_asset", id: asset.id }]),
    ).toThrow("Unlock tracks");
    expect(locked.assets).toHaveLength(1);
    expect(locked.clips).toHaveLength(1);
  });
  it("splits slowed footage at the correct source time without mutating history", () => {
    const { p, c } = fixture();
    c.speed = 0.5;
    const next = editProject(p, [{ op: "split", id: c.id, time: 4 }]);
    expect(p.clips).toHaveLength(1);
    expect(next.clips).toHaveLength(2);
    expect(next.clips[0].duration).toBe(4);
    expect(next.clips[1].in).toBe(2);
    expect(next.clips[1].duration).toBe(6);
    expect(next.revision).toBe(1);
  });
  it("rejects splitting at boundaries and source overruns", () => {
    const { p, c } = fixture();
    expect(() =>
      editProject(p, [{ op: "split", id: c.id, time: 0 }]),
    ).toThrow();
    expect(() =>
      editProject(p, [
        { op: "update_clip", id: c.id, patch: { duration: 21 } },
      ]),
    ).toThrow("source media");
  });
  it("ripple deletes only later segments on the affected track", () => {
    const { p, c } = fixture();
    const nextClip = { ...c, id: "later", start: 12, duration: 4 };
    p.clips.push(nextClip, {
      ...c,
      id: "other-track",
      trackId: p.tracks[0].id,
      start: 12,
      duration: 4,
    });
    const next = editProject(p, [
      { op: "delete_clip", id: c.id, ripple: true },
    ]);
    expect(next.clips.find((c) => c.id === "later")?.start).toBe(2);
    expect(next.clips.find((c) => c.id === "other-track")?.start).toBe(12);
  });
  it("makes a dissolve by overlapping the later clip", () => {
    const { p, c } = fixture();
    p.clips.push({ ...c, id: "next", start: 10, duration: 5 });
    const next = editProject(p, [{ op: "transition", id: "next", seconds: 1 }]);
    expect(next.clips[1].start).toBe(9);
    expect(next.clips[1].fadeIn).toBe(1);
  });
  it("rejects invalid references, duplicate IDs, locked edits, and nonfinite geometry", () => {
    const { p, c } = fixture();
    expect(() => validateProject({ ...p, clips: [c, c] })).toThrow("Duplicate");
    expect(() =>
      validateProject({ ...p, clips: [{ ...c, trackId: "missing" }] }),
    ).toThrow("track");
    expect(() =>
      validateProject({ ...p, clips: [{ ...c, x: Infinity }] }),
    ).toThrow();
    p.tracks[1].locked = true;
    expect(() => editProject(p, [{ op: "delete_clip", id: c.id }])).toThrow(
      "locked",
    );
  });
  it("snaps to nearby edges while excluding the moving clip", () => {
    const { p, c } = fixture();
    expect(snapTime(9.95, p, "other", 3, 0.1)).toBe(10);
    expect(snapTime(9.95, p, c.id, 3, 0.1)).toBe(9.95);
  });
});
describe("shared preview/export geometry", () => {
  it("interpolates keyframes and fade envelopes deterministically", () => {
    const { p, c } = fixture();
    c.keyframes = [
      { property: "x", time: 0, value: 0 },
      { property: "x", time: 4, value: 1 },
    ];
    c.fadeIn = 4;
    const v = pose(c, p, 2);
    expect(v.x).toBe(p.width * 0.5);
    expect(v.alpha).toBe(0.5);
  });
  it("respects the anchor and rotation", () => {
    const { p, c } = fixture();
    c.width = 0.5;
    c.height = 0.5;
    c.rotation = 90;
    const pts = corners(pose(c, p, 1));
    expect(pts[0].x).toBeCloseTo(p.width * 0.5 + p.height * 0.25);
    expect(pts[0].y).toBeCloseTo(p.height * 0.5 - p.width * 0.25);
  });
});
