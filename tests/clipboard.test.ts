import { describe, expect, it } from "vitest";
import { TimelineClipboard } from "../src/core/clipboard";
import {
  editProject,
  emptyProject,
  newClip,
  newElement,
} from "../src/core/model";

describe("timeline clipboard", () => {
  it("takes a deep snapshot, pastes at the nearest frame, and gives each paste a new id", () => {
    const p = emptyProject(),
      clipboard = new TimelineClipboard();
    const clip = newClip(p, "shape", p.tracks[0].id, 2);
    clip.fillGradient = {
      type: "linear",
      angle: 25,
      stops: [
        { offset: 0, color: "#ff0000", opacity: 0.5 },
        { offset: 1, color: "#0000ff", opacity: 1 },
      ],
    };
    clipboard.copy(clip);
    clip.fillGradient.stops[0].color = "#ffffff";
    const first = clipboard.paste(p, 1.013)!;
    const pasted = editProject(p, first.edits).clips[0];
    expect(pasted.start).toBe(Math.round(1.013 * p.fps) / p.fps);
    expect(pasted.fillGradient!.stops[0].color).toBe("#ff0000");
    expect(pasted.id).not.toBe(clip.id);
    expect(pasted.id).not.toBe(clipboard.paste(p, 1)!.selected);
    expect(pasted.trackId).toBe(clip.trackId);
  });
  it("finds an unlocked compatible track or adds one atomically", () => {
    const p = emptyProject(),
      clipboard = new TimelineClipboard();
    clipboard.copy(newClip(p, "audio", p.tracks[2].id));
    p.tracks[2].locked = true;
    const result = clipboard.paste(p, 0)!;
    expect(result.edits.map((e) => e.op)).toEqual(["add_track", "add_clip"]);
    const next = editProject(p, result.edits);
    expect(next.tracks[0].type).toBe("audio");
    expect(next.clips[0].trackId).toBe(next.tracks[0].id);
  });
  it("handles an empty clipboard and rejects missing source media", () => {
    const p = emptyProject(),
      clipboard = new TimelineClipboard();
    expect(clipboard.paste(p, 0)).toBeNull();
    const clip = newClip(p, "video", p.tracks[1].id);
    clip.assetId = "missing";
    clipboard.copy(clip);
    expect(() => clipboard.paste(p, 0)).toThrow("missing");
    expect(p.clips).toHaveLength(0);
  });
});

describe("circle presets", () => {
  it("creates a circle with equal pixel dimensions in landscape, portrait, and square projects", () => {
    for (const [width, height] of [
      [1920, 1080],
      [1080, 1920],
      [1000, 1000],
    ]) {
      const p = { ...emptyProject(), width, height };
      const c = newElement(p, "shape", p.tracks[0].id, 0, "ellipse");
      expect(c.width * width).toBeCloseTo(c.height * height);
    }
  });
});
