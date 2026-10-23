import { describe, expect, it } from "vitest";
import { PeakBuilder, Waveform } from "../src/engine/waveform";
import { newClip, emptyProject } from "../src/core/model";
import { sourceTime } from "../src/core/audio-envelope";
describe("source-time audio peaks", () => {
  it("retains silence, short impulses, right-channel audio, and content after twelve seconds", () => {
    const builder = new PeakBuilder(20);
    const left = new Float32Array(48000),
      right = new Float32Array(48000);
    left[17] = 0.8;
    right[40001] = -0.95;
    builder.add([left, right], 14, 48000);
    const wave = new Waveform(builder.data);
    expect(wave.peak(0, 12)).toBe(0);
    expect(wave.peak(14, 14.01)).toBeCloseTo(0.8);
    expect(wave.peak(14.83, 14.84)).toBeCloseTo(0.95);
    expect(wave.peak(16, 20)).toBe(0);
  });
  it("bins by timestamps and sample rate, regardless of decoder packet size", () => {
    const a = new PeakBuilder(1),
      b = new PeakBuilder(1);
    const pcm = Float32Array.from(
      { length: 1000 },
      (_, i) => (Math.sin(i) * i) / 1000,
    );
    a.add([pcm], 0, 1000);
    b.add([pcm.slice(0, 137)], 0, 1000);
    b.add([pcm.slice(137, 873)], 0.137, 1000);
    b.add([pcm.slice(873)], 0.873, 1000);
    // Different decoder packet boundaries must not shift source peaks.
    for (let i = 0; i < 10; i++)
      expect(new Waveform(a.data).peak(i / 10, (i + 1) / 10)).toBeCloseTo(
        new Waveform(b.data).peak(i / 10, (i + 1) / 10),
        3,
      );
  });
  it("maps trimmed and retimed clip windows to the actual source section", () => {
    const builder = new PeakBuilder(20);
    builder.add([new Float32Array(1000).fill(0.25)], 4, 1000);
    builder.add([new Float32Array(1000).fill(0.75)], 14, 1000);
    const wave = new Waveform(builder.data),
      p = emptyProject();
    const c = newClip(p, "audio", p.tracks[2].id);
    c.in = 14;
    c.speed = 2;
    c.duration = 0.5;
    expect(wave.peak(sourceTime(c, 0), sourceTime(c, 0.5))).toBeCloseTo(0.75);
    c.in = 4;
    expect(wave.peak(sourceTime(c, 0), sourceTime(c, 0.5))).toBeCloseTo(0.25);
  });
  it("queries peak pyramids accurately for arbitrary visible windows and bounds memory", () => {
    const builder = new PeakBuilder(3);
    builder.data.peaks = Float32Array.from(
      { length: 600 },
      (_, i) => ((i * 73) % 211) / 211,
    );
    const wave = new Waveform(builder.data);
    for (let a = 0; a < 500; a += 13)
      for (let b = a + 1; b < 600; b += 37) {
        expect(wave.peak(a / 200, b / 200)).toBeCloseTo(
          Math.max(...builder.data.peaks.slice(a, b)),
          5,
        );
      }
    const long = new PeakBuilder(4 * 3600);
    expect(long.data.peaks.length).toBeLessThanOrEqual(240000);
    expect(
      new Waveform(long.data).levels.reduce((n, a) => n + a.byteLength, 0),
    ).toBeLessThan(2_000_100);
  });
});
