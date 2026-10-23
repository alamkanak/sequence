import { describe, expect, it } from "vitest";
import {
  audioGain,
  dbToGain,
  duckVolumeRange,
  putVolumePoint,
  setClipVolume,
  volumeAt,
} from "../src/core/audio-envelope";
import {
  editProject,
  emptyProject,
  newClip,
  validateProject,
  type Asset,
} from "../src/core/model";
import { AudioMixer, files } from "../src/engine/media";
function fixture() {
  const p = emptyProject();
  const asset: Asset = {
    id: "tone",
    name: "tone.wav",
    kind: "audio",
    duration: 20,
    width: 0,
    height: 0,
    fps: 0,
    hasAudio: true,
    hdr: false,
    size: 1,
    type: "audio/wav",
  };
  p.assets = [asset];
  const c = newClip(p, "audio", p.tracks[2].id, 3, asset);
  c.in = 2;
  c.duration = 10;
  p.clips = [c];
  return { p, c };
}
describe("source-time volume automation", () => {
  it("ducks only the selected region with smooth ramps and unchanged surrounding levels", () => {
    const { c } = fixture();
    c.volume = 0.8;
    c.volumeKeyframes = duckVolumeRange(c, 3, 6, dbToGain(-12), 0.25);
    expect(audioGain(c, 2.9)).toBeCloseTo(0.8);
    expect(audioGain(c, 3)).toBeCloseTo(0.8);
    expect(audioGain(c, 3.125)).toBeCloseTo((0.8 + dbToGain(-12)) / 2);
    expect(audioGain(c, 4)).toBeCloseTo(dbToGain(-12));
    expect(audioGain(c, 6)).toBeCloseTo(0.8);
    expect(audioGain(c, 8)).toBeCloseTo(0.8);
  });
  it("preserves the audio curve after trimming, retiming, moving, splitting, and JSON round-trip", () => {
    const { p, c } = fixture();
    c.volumeKeyframes = duckVolumeRange(c, 2, 7, 0.1, 0.2);
    const original = structuredClone(c);
    c.in += 1.5;
    c.duration -= 1.5;
    c.start += 1.5;
    for (const t of [0.2, 1, 3, 5])
      expect(audioGain(c, t)).toBeCloseTo(audioGain(original, t + 1.5));
    const faster = { ...original, speed: 2, duration: 5 };
    expect(audioGain(faster, 2)).toBeCloseTo(audioGain(original, 4));
    const next = editProject({ ...p, clips: [original] }, [
      { op: "split", id: original.id, time: original.start + 4 },
    ]);
    const right = next.clips[1];
    for (const t of [0.1, 1, 2.9, 5])
      expect(audioGain(right, t)).toBeCloseTo(audioGain(original, t + 4));
    expect(
      validateProject(JSON.parse(JSON.stringify(next))).clips[1]
        .volumeKeyframes,
    ).toEqual(right.volumeKeyframes);
  });
  it("adds anchors, preserves unrelated points when ducking, and scales points with overall volume", () => {
    const { c } = fixture();
    c.volumeKeyframes = putVolumePoint(c, 1, 0.5);
    expect(c.volumeKeyframes.map((k) => k.time)).toEqual([2, 3, 12]);
    const ducked = { ...c, volumeKeyframes: duckVolumeRange(c, 3, 6, 0.1) };
    expect(ducked.volumeKeyframes.find((k) => k.time === 3)?.value).toBe(0.5);
    const adjusted = { ...ducked, ...setClipVolume(ducked, 0.5) };
    expect(volumeAt(adjusted, 6)).toBeCloseTo(0.05);
    expect(adjusted.volumeKeyframes.find((k) => k.time === 3)?.value).toBe(
      0.25,
    );
  });
  it("applies envelope gain and fades in the real mixer and retains audible points when base volume is zero", async () => {
    const { p, c } = fixture();
    c.start = 0;
    c.in = 0;
    c.duration = 10;
    c.volume = 0;
    c.fadeIn = 0.5;
    c.fadeOut = 0.5;
    c.volumeKeyframes = [
      { time: 0, value: 1 },
      { time: 3, value: 1 },
      { time: 3.2, value: 0.1 },
      { time: 6, value: 0.1 },
      { time: 6.2, value: 1 },
      { time: 10, value: 1 },
    ];
    files.set("tone", new File(["test"], "tone.wav"));
    const mixer = new AudioMixer();
    mixer.cursors.set(c.id, {
      input: { dispose() {} },
      iterator: {
        async return() {
          return { done: true, value: undefined };
        },
      },
      blocks: [
        {
          timestamp: 0,
          rate: 1000,
          duration: 10,
          channels: [new Float32Array(10000).fill(0.5)],
        },
      ],
      last: 0,
      ended: true,
    } as any);
    const [pcm] = await mixer.mix(p, 0, 10000, 1000);
    expect(pcm[250]).toBeCloseTo(0.25);
    expect(pcm[2000]).toBeCloseTo(0.5);
    expect(pcm[4000]).toBeCloseTo(0.05);
    expect(pcm[8000]).toBeCloseTo(0.5);
    expect(pcm[9750]).toBeCloseTo(0.25);
    files.delete("tone");
  });
  it("migrates old projects without automation and rejects invalid points", () => {
    const { p, c } = fixture();
    const old = JSON.parse(JSON.stringify(p));
    delete old.clips[0].volumeKeyframes;
    old.assets[0].waveform = [0.9, 0.9];
    expect("waveform" in validateProject(old).assets[0]).toBe(false);
    expect(validateProject(old).clips[0].volumeKeyframes).toEqual([]);
    c.volumeKeyframes = [{ time: 1, value: -1 }];
    expect(() => validateProject(p)).toThrow();
  });
});
