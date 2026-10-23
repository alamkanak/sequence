import { describe, it, expect } from "vitest";
import { snapAlignment } from "../src/engine/alignment";
import { corners, type Pose } from "../src/engine/scene";
import { emptyProject } from "../src/core/model";
const project = { ...emptyProject(), width: 1000, height: 800 };
const center: Pose = {
  x: 503,
  y: 397,
  w: 200,
  h: 160,
  angle: 0,
  alpha: 1,
  anchorX: 0.5,
  anchorY: 0.5,
};
describe("preview alignment", () => {
  it("snaps both visual centers and reports visible center guides", () => {
    const snap = snapAlignment(center, project, 6);
    expect(snap.dx).toBe(-3);
    expect(snap.dy).toBe(3);
    expect(snap.guides).toEqual([
      { axis: "x", value: 500 },
      { axis: "y", value: 400 },
    ]);
  });
  it("snaps each stage edge from either side of its boundary", () => {
    for (const delta of [-5, 5]) {
      expect(
        snapAlignment({ ...center, x: 100 + delta, y: 250 }, project, 6).dx,
      ).toBe(-delta);
      expect(
        snapAlignment({ ...center, x: 900 + delta, y: 250 }, project, 6).guides,
      ).toContainEqual({ axis: "x", value: 1000 });
      expect(
        snapAlignment({ ...center, x: 300, y: 80 + delta }, project, 6).dy,
      ).toBe(-delta);
      expect(
        snapAlignment({ ...center, x: 300, y: 720 + delta }, project, 6).guides,
      ).toContainEqual({ axis: "y", value: 800 });
    }
  });
  it("does not pull elements toward guides outside the snap tolerance", () => {
    expect(snapAlignment({ ...center, x: 530, y: 430 }, project, 6)).toEqual({
      dx: 0,
      dy: 0,
      guides: [],
    });
  });
  it("uses the visual bounds of rotated elements with custom anchors", () => {
    const v = { ...center, angle: Math.PI / 5, anchorX: 0.2, anchorY: 0.8 };
    const points = corners(v);
    const cx =
      (Math.min(...points.map((p) => p.x)) +
        Math.max(...points.map((p) => p.x))) /
      2;
    const cy =
      (Math.min(...points.map((p) => p.y)) +
        Math.max(...points.map((p) => p.y))) /
      2;
    const snap = snapAlignment(
      { ...v, x: v.x + 504 - cx, y: v.y + 396 - cy },
      project,
      6,
    );
    expect(snap.dx).toBeCloseTo(-4);
    expect(snap.dy).toBeCloseTo(4);
    expect(v.anchorX).toBe(0.2);
  });
});
