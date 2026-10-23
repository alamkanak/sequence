import { describe, expect, it } from "vitest";
import { emptyProject, newClip } from "../src/core/model";
import { pose } from "../src/engine/scene";
import { resizeHandles } from "../src/engine/transform";
import { snapResize } from "../src/engine/resize-alignment";
function fixture(rotation = 0) {
  const p = { ...emptyProject(), width: 1000, height: 800 };
  const c = newClip(p, "shape", p.tracks[0].id);
  Object.assign(c, { x: 0.3, y: 0.3, width: 0.2, height: 0.25, rotation });
  const initial = pose(c, p, 1);
  return { p, c, initial };
}
describe("resize alignment", () => {
  it("snaps all four stage edges", () => {
    const { p, c, initial } = fixture();
    for (const [id, dx, dy, axis, value] of [
      ["w", -197, 0, "x", 0],
      ["e", 597, 0, "x", 1000],
      ["n", 0, -137, "y", 0],
      ["s", 0, 457, "y", 800],
    ] as const) {
      const handle = resizeHandles(initial).find((h) => h.id === id)!;
      const result = snapResize(c, p, initial, handle, dx, dy, true, false, 6);
      const after = resizeHandles(pose({ ...c, ...result.patch }, p, 1)).find(
        (h) => h.id === id,
      )!;
      expect(after[axis]).toBeCloseTo(value);
      expect(result.guides).toContainEqual({ axis, value });
    }
  });
  it("snaps a rotated side to a center line while preserving the visual center", () => {
    const { p, c, initial } = fixture(90);
    const handle = resizeHandles(initial).find((h) => h.id === "e")!;
    const result = snapResize(c, p, initial, handle, 0, 57, true, true, 6);
    const next = resizeHandles(pose({ ...c, ...result.patch }, p, 1));
    expect(next.find((h) => h.id === "e")!.y).toBeCloseTo(400);
    expect((next[0].y + next[4].y) / 2).toBeCloseTo(240);
    expect(result.patch.height).toBe(c.height);
    expect(result.guides).toContainEqual({ axis: "y", value: 400 });
  });
  it("snaps a side to center without changing height or its opposite side", () => {
    const { p, c, initial } = fixture();
    const handle = resizeHandles(initial).find((h) => h.id === "e")!;
    const result = snapResize(c, p, initial, handle, 97, 45, true, false, 6);
    const next = resizeHandles(pose({ ...c, ...result.patch }, p, 1));
    expect(next.find((h) => h.id === "e")!.x).toBeCloseTo(500);
    expect(next.find((h) => h.id === "w")!.x).toBeCloseTo(200);
    expect(result.patch.height).toBe(c.height);
    expect(result.guides).toEqual([{ axis: "x", value: 500 }]);
  });
  it("snaps proportional corners to an edge without breaking aspect ratio", () => {
    const { p, c, initial } = fixture();
    const handle = resizeHandles(initial).find((h) => h.id === "se")!;
    const result = snapResize(c, p, initial, handle, 457, 457, true, false, 6);
    const after = resizeHandles(pose({ ...c, ...result.patch }, p, 1)).find(
      (h) => h.id === "se",
    )!;
    expect(after.y).toBeCloseTo(800);
    expect(result.patch.width! / result.patch.height!).toBeCloseTo(
      c.width / c.height,
    );
    expect(result.guides).toContainEqual({ axis: "y", value: 800 });
  });
  it("snaps free corners to both axes and keeps the opposite corner fixed", () => {
    const { p, c, initial } = fixture();
    const handle = resizeHandles(initial).find((h) => h.id === "se")!;
    const result = snapResize(c, p, initial, handle, 97, 57, false, false, 6);
    const next = resizeHandles(pose({ ...c, ...result.patch }, p, 1));
    expect(next.find((h) => h.id === "se")!.x).toBeCloseTo(500);
    expect(next.find((h) => h.id === "se")!.y).toBeCloseTo(400);
    expect(next.find((h) => h.id === "nw")!.x).toBeCloseTo(200);
    expect(next.find((h) => h.id === "nw")!.y).toBeCloseTo(140);
    expect(result.guides).toHaveLength(2);
  });
  it("retains the visual center for centered snapping, including rotation", () => {
    for (const rotation of [0, 37, 90]) {
      const { p, c, initial } = fixture(rotation);
      const handle = resizeHandles(initial).find((h) => h.id === "se")!;
      const result = snapResize(c, p, initial, handle, 97, 97, true, true, 6);
      const next = resizeHandles(pose({ ...c, ...result.patch }, p, 1));
      expect((next[0].x + next[4].x) / 2).toBeCloseTo(c.x * p.width);
      expect((next[0].y + next[4].y) / 2).toBeCloseTo(c.y * p.height);
      expect(result.patch.width! / result.patch.height!).toBeCloseTo(
        c.width / c.height,
      );
    }
  });
  it("leaves a resize unchanged when no target is near", () => {
    const { p, c, initial } = fixture();
    const handle = resizeHandles(initial).find((h) => h.id === "e")!;
    const result = snapResize(c, p, initial, handle, 45, 0, true, false, 6);
    expect(result.guides).toEqual([]);
    expect(result.patch.width).toBeCloseTo(0.245);
  });
});
