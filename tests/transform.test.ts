import { describe, expect, it } from "vitest";
import { emptyProject, newClip, validateProject } from "../src/core/model";
import { pose } from "../src/engine/scene";
import {
  resizeClip,
  resizeCursor,
  resizeHandles,
  rotationHandle,
} from "../src/engine/transform";
function fixture() {
  const project = emptyProject();
  const clip = newClip(project, "shape", project.tracks[0].id, 0);
  Object.assign(clip, { width: 0.4, height: 0.3, scale: 1.25 });
  project.clips = [clip];
  return { project, clip };
}
describe("preview resize geometry", () => {
  it("Option-resizes both opposite sides equally without changing the element center", () => {
    const { project, clip } = fixture(),
      initial = pose(clip, project, 1);
    const old = resizeHandles(initial),
      handle = old.find((h) => h.id === "e")!;
    const patch = resizeClip(
      clip,
      project,
      initial,
      handle,
      80,
      0,
      false,
      true,
    );
    const next = resizeHandles(pose({ ...clip, ...patch }, project, 1));
    expect(next.find((h) => h.id === "e")!.x - handle.x).toBeCloseTo(80);
    expect(
      next.find((h) => h.id === "w")!.x - old.find((h) => h.id === "w")!.x,
    ).toBeCloseTo(-80);
    expect(patch.x).toBe(clip.x);
    expect(patch.y).toBe(clip.y);
    expect(patch.height).toBe(clip.height);
  });
  it("keeps the visual center fixed for Option-resizing rotated elements and custom pivots", () => {
    for (const rotation of [0, 37, 90])
      for (const anchorX of [0.2, 0.5, 1.2]) {
        const { project, clip } = fixture();
        Object.assign(clip, { rotation, anchorX, anchorY: 0.7 });
        const initial = pose(clip, project, 1),
          old = resizeHandles(initial);
        for (const handle of old) {
          const dx =
            handle.sx * 40 * Math.cos(initial.angle) -
            handle.sy * 20 * Math.sin(initial.angle);
          const dy =
            handle.sx * 40 * Math.sin(initial.angle) +
            handle.sy * 20 * Math.cos(initial.angle);
          const next = resizeHandles(
            pose(
              {
                ...clip,
                ...resizeClip(
                  clip,
                  project,
                  initial,
                  handle,
                  dx,
                  dy,
                  false,
                  true,
                ),
              },
              project,
              1,
            ),
          );
          expect((next[0].x + next[4].x) / 2).toBeCloseTo(
            (old[0].x + old[4].x) / 2,
          );
          expect((next[0].y + next[4].y) / 2).toBeCloseTo(
            (old[0].y + old[4].y) / 2,
          );
        }
      }
  });
  it("combines proportions with Option-centered corner resizing", () => {
    const { project, clip } = fixture(),
      initial = pose(clip, project, 1),
      handle = resizeHandles(initial).find((h) => h.id === "se")!;
    const patch = resizeClip(
      clip,
      project,
      initial,
      handle,
      100,
      20,
      true,
      true,
    );
    expect(patch.width! / patch.height!).toBeCloseTo(clip.width / clip.height);
    expect(patch.x).toBe(clip.x);
    expect(patch.y).toBe(clip.y);
  });
  it("changes width without changing height or uniform scale using a side handle", () => {
    const { project, clip } = fixture(),
      initial = pose(clip, project, 1);
    const handles = resizeHandles(initial);
    const patch = resizeClip(
      clip,
      project,
      initial,
      handles.find((h) => h.id === "e")!,
      100,
      80,
    );
    const next = { ...clip, ...patch },
      resized = resizeHandles(pose(next, project, 1));
    expect(next.width).toBeGreaterThan(clip.width);
    expect(next.height).toBe(clip.height);
    expect(next.scale).toBe(clip.scale);
    expect(resized.find((h) => h.id === "w")!.x).toBeCloseTo(
      handles.find((h) => h.id === "w")!.x,
    );
    expect(next.y).toBe(clip.y);
  });
  it("changes height independently using the top handle", () => {
    const { project, clip } = fixture(),
      initial = pose(clip, project, 1);
    const patch = resizeClip(
      clip,
      project,
      initial,
      resizeHandles(initial).find((h) => h.id === "n")!,
      80,
      -100,
    );
    expect(patch.width).toBe(clip.width);
    expect(patch.height).toBeGreaterThan(clip.height);
    const bottomBefore = resizeHandles(initial).find((h) => h.id === "s")!;
    const bottomAfter = resizeHandles(
      pose({ ...clip, ...patch }, project, 1),
    ).find((h) => h.id === "s")!;
    expect(bottomAfter.y).toBeCloseTo(bottomBefore.y);
  });
  it("keeps opposite handles fixed for all eight handles, rotated axes, and custom anchors", () => {
    for (const rotation of [0, 37, 90]) {
      for (const anchorX of [0.25, 0.5, 1.2]) {
        const { project, clip } = fixture();
        Object.assign(clip, { rotation, anchorX, anchorY: 0.7 });
        const initial = pose(clip, project, 1),
          handles = resizeHandles(initial);
        for (const handle of handles) {
          const localX = handle.sx * 80,
            localY = handle.sy * 40;
          const dx =
            localX * Math.cos(initial.angle) - localY * Math.sin(initial.angle);
          const dy =
            localX * Math.sin(initial.angle) + localY * Math.cos(initial.angle);
          const patch = resizeClip(clip, project, initial, handle, dx, dy);
          const next = { ...clip, ...patch };
          const opposite = handles.find(
            (h) => h.sx === -handle.sx && h.sy === -handle.sy,
          )!;
          const after = resizeHandles(pose(next, project, 1)).find(
            (h) => h.id === opposite.id,
          )!;
          expect(after.x).toBeCloseTo(opposite.x);
          expect(after.y).toBeCloseTo(opposite.y);
          if (!handle.sx) expect(next.width).toBeCloseTo(clip.width);
          if (!handle.sy) expect(next.height).toBeCloseTo(clip.height);
          expect(() =>
            validateProject({ ...project, clips: [next] }),
          ).not.toThrow();
        }
      }
    }
  });
  it("preserves corner proportions by default and allows an explicit free resize", () => {
    const { project, clip } = fixture(),
      initial = pose(clip, project, 1);
    const handle = resizeHandles(initial).find((h) => h.id === "se")!;
    const free = resizeClip(clip, project, initial, handle, 200, 10, false);
    const locked = resizeClip(clip, project, initial, handle, 200, 10);
    expect(free.width! / free.height!).not.toBeCloseTo(
      clip.width / clip.height,
    );
    expect(locked.width! / locked.height!).toBeCloseTo(
      clip.width / clip.height,
    );
  });
  it("clamps dimensions when dragging past the opposite edge", () => {
    const { project, clip } = fixture(),
      initial = pose(clip, project, 1);
    const handle = resizeHandles(initial).find((h) => h.id === "e")!;
    const next = {
      ...clip,
      ...resizeClip(clip, project, initial, handle, -10000, 0),
    };
    expect(next.width).toBeGreaterThan(0);
    expect(next.height).toBe(clip.height);
    const leftBefore = resizeHandles(initial).find((h) => h.id === "w")!;
    const leftAfter = resizeHandles(pose(next, project, 1)).find(
      (h) => h.id === "w",
    )!;
    expect(leftAfter.x).toBeCloseTo(leftBefore.x);
  });
  it("rotates resize cursors and the rotation handle with the element", () => {
    const { project, clip } = fixture(),
      initial = pose(clip, project, 1);
    const handles = resizeHandles(initial);
    expect(handles).toHaveLength(8);
    expect(
      resizeCursor(
        handles.find((h) => h.id === "e")!,
        0,
      ),
    ).toBe("ew");
    expect(
      resizeCursor(
        handles.find((h) => h.id === "n")!,
        0,
      ),
    ).toBe("ns");
    expect(
      resizeCursor(
        handles.find((h) => h.id === "ne")!,
        0,
      ),
    ).toBe("nesw");
    expect(
      resizeCursor(
        handles.find((h) => h.id === "e")!,
        Math.PI / 2,
      ),
    ).toBe("ns");
    const rotated = { ...initial, angle: Math.PI / 2 };
    const top = resizeHandles(rotated).find((h) => h.id === "n")!;
    const knob = rotationHandle(rotated, 24);
    expect(knob.x - top.x).toBeCloseTo(24);
    expect(knob.y).toBeCloseTo(top.y);
  });
});
