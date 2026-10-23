import type { Clip, Gradient, GradientStop } from "../core/model";
export function rgba(color: string, opacity: number) {
  const channels = color
    .slice(1)
    .match(/../g)!
    .map((v) => parseInt(v, 16));
  return `rgba(${channels.join(",")},${opacity})`;
}
export function defaultGradient(color: string): Gradient {
  return {
    type: "linear",
    angle: 0,
    stops: [
      { offset: 0, color, opacity: 1 },
      { offset: 1, color: "#6366f1", opacity: 1 },
    ],
  };
}
export function addGradientStop(gradient: Gradient): Gradient {
  if (gradient.stops.length >= 8) return gradient;
  const sorted = [...gradient.stops].sort((a, b) => a.offset - b.offset);
  let gap = 0;
  for (let i = 1; i < sorted.length - 1; i++)
    if (
      sorted[i + 1].offset - sorted[i].offset >
      sorted[gap + 1].offset - sorted[gap].offset
    )
      gap = i;
  const a = sorted[gap],
    b = sorted[gap + 1];
  const color =
    "#" +
    [0, 1, 2]
      .map((i) =>
        Math.round(
          (parseInt(a.color.slice(1 + i * 2, 3 + i * 2), 16) +
            parseInt(b.color.slice(1 + i * 2, 3 + i * 2), 16)) /
            2,
        )
          .toString(16)
          .padStart(2, "0"),
      )
      .join("");
  const stop: GradientStop = {
    offset: (a.offset + b.offset) / 2,
    color,
    opacity: (a.opacity + b.opacity) / 2,
  };
  sorted.splice(gap + 1, 0, stop);
  return { ...gradient, stops: sorted };
}
export function paintStyle(
  ctx: OffscreenCanvasRenderingContext2D,
  w: number,
  h: number,
  color: string,
  opacity: number,
  gradient: Gradient | null,
) {
  if (!gradient) return rgba(color, opacity);
  let paint: CanvasGradient;
  if (gradient.type === "radial")
    paint = ctx.createRadialGradient(
      w / 2,
      h / 2,
      0,
      w / 2,
      h / 2,
      Math.hypot(w, h) / 2,
    );
  else {
    const angle = (gradient.angle * Math.PI) / 180,
      cs = Math.cos(angle),
      sn = Math.sin(angle);
    const extent = (Math.abs(cs) * w + Math.abs(sn) * h) / 2;
    paint = ctx.createLinearGradient(
      w / 2 - cs * extent,
      h / 2 - sn * extent,
      w / 2 + cs * extent,
      h / 2 + sn * extent,
    );
  }
  for (const stop of [...gradient.stops].sort((a, b) => a.offset - b.offset))
    paint.addColorStop(stop.offset, rgba(stop.color, stop.opacity * opacity));
  return paint;
}
export function configurePaint(
  ctx: OffscreenCanvasRenderingContext2D,
  w: number,
  h: number,
  c: Clip,
) {
  ctx.fillStyle = paintStyle(
    ctx,
    w,
    h,
    c.fill,
    c.fillOpacity ?? 1,
    c.fillGradient ?? null,
  );
  ctx.strokeStyle = paintStyle(
    ctx,
    w,
    h,
    c.stroke,
    c.strokeOpacity ?? 1,
    c.strokeGradient ?? null,
  );
  ctx.lineWidth = c.strokeWidth;
}
