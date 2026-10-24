export type HSV = { h: number; s: number; v: number };
export function hexToRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16)) as [
    number,
    number,
    number,
  ];
}
export function rgbToHex(rgb: number[]) {
  return `#${rgb
    .map((channel) =>
      Math.max(0, Math.min(255, Math.round(channel)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}
export function hexToHsv(hex: string): HSV {
  const [r, g, b] = hexToRgb(hex).map((channel) => channel / 255);
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    delta = max - min;
  const hue = !delta
    ? 0
    : max === r
      ? ((g - b) / delta) % 6
      : max === g
        ? (b - r) / delta + 2
        : (r - g) / delta + 4;
  return { h: (hue * 60 + 360) % 360, s: max ? delta / max : 0, v: max };
}
export function hsvToHex({ h, s, v }: HSV) {
  const channel = (n: number) => {
    const k = (n + h / 60) % 6;
    return (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255;
  };
  return rgbToHex([channel(5), channel(3), channel(1)]);
}
