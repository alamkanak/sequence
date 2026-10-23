import { describe, it, expect } from "vitest";
import { wrapText } from "../src/engine/text-layout";
import { elementRegistry } from "../src/engine/elements";
import { emptyProject, newClip } from "../src/core/model";
describe("text box resizing", () => {
  it("reflows words at the same glyph widths when the box becomes narrower", () => {
    const measure = (text: string) => text.length * 10;
    expect(wrapText("One two three", 140, measure)).toEqual(["One two three"]);
    expect(wrapText("One two three", 70, measure)).toEqual([
      "One two",
      "three",
    ]);
    expect(wrapText("One two three", 40, measure)).toEqual([
      "One",
      "two",
      "thre",
      "e",
    ]);
  });
  it("preserves explicit line breaks and empty lines", () => {
    expect(wrapText("Title\n\nSubtitle", 100, (text) => text.length)).toEqual([
      "Title",
      "",
      "Subtitle",
    ]);
  });
  it("wraps long words without splitting combined emoji", () => {
    const segmenter = new Intl.Segmenter(undefined, {
      granularity: "grapheme",
    });
    const measure = (text: string) => [...segmenter.segment(text)].length;
    expect(wrapText("👩‍💻👩‍💻", 1, measure)).toEqual(["👩‍💻", "👩‍💻"]);
  });
  it("paints natural-width glyphs instead of using the canvas maxWidth compression", () => {
    const project = emptyProject(),
      clip = newClip(project, "text", project.tracks[0].id, 0);
    clip.text = "Hello world";
    clip.fontSize = 24;
    clip.strokeWidth = 1;
    const calls: unknown[][] = [];
    const ctx = {
      font: "",
      textAlign: "",
      textBaseline: "",
      measureText: (t: string) => ({ width: t.length * 10 }),
      fillText: (...args: unknown[]) => calls.push(args),
      strokeText: (...args: unknown[]) => calls.push(args),
    };
    elementRegistry.get("text")!.paint!(
      ctx as unknown as OffscreenCanvasRenderingContext2D,
      70,
      100,
      clip,
      project,
      0,
    );
    expect(ctx.font).toContain("24px");
    expect(calls.map((c) => c[0])).toEqual([
      "Hello",
      "Hello",
      "world",
      "world",
    ]);
    expect(calls.every((c) => c.length === 3)).toBe(true);
    expect(clip.fontSize).toBe(24);
  });
});
