import type { Clip, Kind, Project } from "../core/model";
import { wrapText } from "./text-layout";
import { configurePaint } from "./paint";
const paintProperties: (keyof Clip)[] = [
  "fill",
  "fillOpacity",
  "fillGradient",
  "stroke",
  "strokeOpacity",
  "strokeGradient",
  "strokeWidth",
];
export interface ElementDefinition {
  type: Kind;
  title: string;
  duration: "fixed" | "source";
  properties: (keyof Clip)[];
  paint?: (
    ctx: OffscreenCanvasRenderingContext2D,
    w: number,
    h: number,
    clip: Clip,
    project: Project,
    time: number,
  ) => void;
}
/** Register adapters at build time; the same registry is bundled into preview/export workers. */
export const elementRegistry = new Map<Kind, ElementDefinition>();
export function registerElement(definition: ElementDefinition) {
  if (elementRegistry.has(definition.type))
    throw new Error(`Duplicate element adapter: ${definition.type}`);
  elementRegistry.set(definition.type, definition);
}
registerElement({
  type: "text",
  title: "Text",
  duration: "fixed",
  properties: ["text", "font", "fontSize", ...paintProperties],
  paint(ctx, w, h, c) {
    configurePaint(ctx, w, h, c);
    ctx.font = `600 ${c.fontSize}px ${c.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const lines = wrapText(
      c.text,
      Math.max(1, w - Math.max(4, c.strokeWidth * 2)),
      (text) => ctx.measureText(text).width,
    );
    lines.forEach((line, i) => {
      const y = h / 2 + (i - (lines.length - 1) / 2) * c.fontSize * 1.2;
      if (c.strokeWidth) ctx.strokeText(line, w / 2, y);
      ctx.fillText(line, w / 2, y);
    });
  },
});
registerElement({
  type: "shape",
  title: "Shape",
  duration: "fixed",
  properties: ["shape", "radius", ...paintProperties],
  paint(ctx, w, h, c) {
    configurePaint(ctx, w, h, c);
    ctx.beginPath();
    const pad = c.strokeWidth / 2;
    if (c.shape === "ellipse")
      ctx.ellipse(
        w / 2,
        h / 2,
        Math.max(1, w / 2 - pad),
        Math.max(1, h / 2 - pad),
        0,
        0,
        Math.PI * 2,
      );
    else if (c.shape === "line") {
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.lineWidth = Math.max(2, c.strokeWidth);
      if (!c.strokeWidth) ctx.strokeStyle = ctx.fillStyle;
    } else
      ctx.roundRect(
        pad,
        pad,
        Math.max(1, w - 2 * pad),
        Math.max(1, h - 2 * pad),
        Math.min(c.radius, w / 2, h / 2),
      );
    if (c.shape !== "line") ctx.fill();
    if (c.strokeWidth || c.shape === "line") ctx.stroke();
  },
});
registerElement({
  type: "vector",
  title: "Animated orbit",
  duration: "fixed",
  properties: [...paintProperties],
  paint(ctx, w, h, c, _p, t) {
    configurePaint(ctx, w, h, c);
    ctx.translate(w / 2, h / 2);
    ctx.rotate(t * 0.6);
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 3);
      ctx.beginPath();
      ctx.ellipse(0, 0, w * 0.42, h * 0.17, 0, 0, Math.PI * 2);
      ctx.lineWidth = c.strokeWidth || Math.max(2, w * 0.008);
      if (!c.strokeWidth) ctx.strokeStyle = ctx.fillStyle;
      ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, 0, Math.min(w, h) * 0.08, 0, Math.PI * 2);
    ctx.fill();
  },
});
for (const type of ["image", "gif", "video", "audio"] as Kind[])
  registerElement({
    type,
    title: type,
    duration: "source",
    properties: ["in", "speed", "volume"],
  });
export const elementManifest = () =>
  [...elementRegistry.values()].map(({ paint, ...definition }) => definition);
