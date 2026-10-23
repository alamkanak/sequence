import type { Clip } from "../core/model";
import {
  audioGain,
  gainToDb,
  sourceTime,
  volumeAt,
} from "../core/audio-envelope";
import { waveformEntry } from "../core/waveforms";
export interface AudioRange {
  clipId: string;
  start: number;
  end: number;
}
export const volumeY = (gain: number, top: number) =>
  top + 28 + ((12 - Math.max(-60, Math.min(12, gainToDb(gain)))) * 26) / 72;

export function audioVolumeTarget(
  c: Clip,
  local: number,
  y: number,
  top: number,
  zoom: number,
) {
  const key = c.volumeKeyframes.find((k) => {
    const t = (k.time - c.in) / c.speed;
    return (
      t >= 0 &&
      t <= c.duration &&
      Math.hypot((t - local) * zoom, volumeY(k.value, top) - y) <= 6
    );
  });
  if (key) return { time: key.time };
  if (Math.abs(volumeY(volumeAt(c, sourceTime(c, local)), top) - y) <= 4)
    return {};
  return null;
}
/** Draw only visible pixels; aggregate real source peaks rather than stretching a thumbnail. */
export function drawTimelineAudio(
  ctx: CanvasRenderingContext2D,
  c: Clip,
  top: number,
  x: number,
  width: number,
  viewportWidth: number,
  zoom: number,
  selected: boolean,
  range: AudioRange | null,
) {
  const entry = c.assetId ? waveformEntry(c.assetId) : undefined;
  const from = Math.max(1, Math.floor(-x)),
    to = Math.min(width - 1, viewportWidth - x);
  const audio = c.kind === "audio";
  if (entry?.waveform) {
    ctx.fillStyle = audio ? "#64b89b" : "#859ac9";
    const baseline = top + 56,
      maxHeight = audio ? 24 : 18;
    for (let px = from; px < to; px += 3) {
      const a = px / zoom,
        b = Math.min(c.duration, (px + 3) / zoom);
      const peak =
        entry.waveform.peak(sourceTime(c, a), sourceTime(c, b)) *
        audioGain(c, (a + b) / 2);
      if (peak <= 0) continue;
      const h = Math.min(1, peak) * maxHeight;
      ctx.fillRect(x + px, baseline - h, 2, h);
    }
  } else {
    ctx.font = "12px system-ui";
    ctx.fillStyle = "#78958d";
    const label =
      entry?.status === "error"
        ? "Waveform unavailable"
        : `Analyzing audio${entry?.status === "analyzing" ? ` ${Math.round(entry.progress * 100)}%` : "…"}`;
    ctx.fillText(label, Math.max(0, x) + 9, top + 46);
  }
  if (range?.clipId === c.id) {
    const left = x + range.start * zoom,
      w = (range.end - range.start) * zoom;
    ctx.fillStyle = "#aaa1ff38";
    ctx.fillRect(left, top + 7, w, 50);
    ctx.strokeStyle = "#9b8afc";
    ctx.strokeRect(left, top + 8, w, 48);
  }
  ctx.strokeStyle = selected ? "#e4b459" : "#c99f5a";
  ctx.lineWidth = selected ? 1.5 : 1;
  ctx.beginPath();
  for (let px = from; px <= to + 3; px += 3) {
    const at = Math.min(to, px);
    const y = volumeY(volumeAt(c, sourceTime(c, at / zoom)), top);
    if (px === from) ctx.moveTo(x + at, y);
    else ctx.lineTo(x + at, y);
  }
  ctx.stroke();
  ctx.lineWidth = 1;
  if (selected) {
    for (const point of c.volumeKeyframes) {
      const local = (point.time - c.in) / c.speed;
      if (local < -1e-7 || local > c.duration + 1e-7) continue;
      ctx.beginPath();
      ctx.arc(x + local * zoom, volumeY(point.value, top), 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#f5d48c";
      ctx.fill();
      ctx.strokeStyle = "#65502b";
      ctx.stroke();
    }
  }
}
