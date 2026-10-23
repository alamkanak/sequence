import type { Clip } from "./model";
export interface VolumePoint {
  time: number;
  value: number;
}
export const gainToDb = (gain: number) =>
  gain > 0 ? 20 * Math.log10(gain) : -60;
export const dbToGain = (db: number) =>
  db <= -60 ? 0 : Math.min(4, 10 ** (db / 20));
export const formatDb = (gain: number) =>
  gain <= 0 ? "−∞ dB" : `${gainToDb(gain).toFixed(1)} dB`;
export const sourceTime = (c: Clip, local: number) => c.in + local * c.speed;
/** Source-time automation survives moving, trimming, splitting and retiming. */
export function volumeAt(c: Clip, source: number) {
  const keys = c.volumeKeyframes;
  if (!keys.length) return c.volume;
  if (source <= keys[0].time) return keys[0].value;
  // Binary search avoids scanning/sorting points for every mixed audio sample.
  let lo = 0,
    hi = keys.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (keys[mid].time <= source) lo = mid + 1;
    else hi = mid;
  }
  const a = keys[lo - 1],
    b = keys[lo];
  return b
    ? a.value + ((b.value - a.value) * (source - a.time)) / (b.time - a.time)
    : a.value;
}
export function audioGain(c: Clip, local: number) {
  let gain = volumeAt(c, sourceTime(c, local));
  if (c.fadeIn) gain *= Math.max(0, Math.min(1, local / c.fadeIn));
  if (c.fadeOut)
    gain *= Math.max(0, Math.min(1, (c.duration - local) / c.fadeOut));
  return gain;
}
export function normalizeVolumePoints(points: VolumePoint[]): VolumePoint[] {
  const sorted = points
    .map((k) => ({
      time: Math.max(0, k.time),
      value: Math.max(0, Math.min(4, k.value)),
    }))
    .sort((a, b) => a.time - b.time);
  return sorted.filter(
    (k, i) => !sorted[i + 1] || sorted[i + 1].time - k.time > 1e-7,
  );
}
function anchoredPoints(c: Clip) {
  return c.volumeKeyframes.length
    ? c.volumeKeyframes
    : [
        { time: c.in, value: c.volume },
        { time: sourceTime(c, c.duration), value: c.volume },
      ];
}
export function putVolumePoint(c: Clip, local: number, value: number) {
  const time = sourceTime(c, Math.max(0, Math.min(c.duration, local)));
  return normalizeVolumePoints([
    ...anchoredPoints(c).filter((k) => Math.abs(k.time - time) > 1e-7),
    { time, value },
  ]);
}
export function setClipVolume(c: Clip, value: number): Partial<Clip> {
  const ratio = c.volume > 0 ? value / c.volume : 0;
  return {
    volume: value,
    volumeKeyframes: c.volumeKeyframes.map((k) => ({
      ...k,
      value: Math.min(4, c.volume > 0 ? k.value * ratio : value),
    })),
  };
}
/** Four points preserve the existing level outside a selected range. */
export function duckVolumeRange(
  c: Clip,
  start: number,
  end: number,
  gain: number,
  ramp = 0.15,
) {
  const left = Math.max(0, Math.min(start, end)),
    right = Math.min(c.duration, Math.max(start, end));
  if (right <= left) return c.volumeKeyframes;
  const a = sourceTime(c, left),
    b = sourceTime(c, right);
  const fade = Math.min(Math.max(0.001, ramp), (right - left) / 2) * c.speed;
  return normalizeVolumePoints([
    ...anchoredPoints(c).filter((k) => k.time < a || k.time > b),
    { time: a, value: volumeAt(c, a) },
    { time: a + fade, value: gain },
    { time: b - fade, value: gain },
    { time: b, value: volumeAt(c, b) },
  ]);
}
