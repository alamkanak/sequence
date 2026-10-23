/** Uniform source-time peak bins, independent of decoder packet boundaries. */
export interface WaveformData {
  version: 2;
  duration: number;
  rate: number;
  peaks: Float32Array;
}
export class PeakBuilder {
  data: WaveformData;
  constructor(duration: number) {
    const rate = Math.min(200, 240000 / Math.max(1, duration));
    this.data = {
      version: 2,
      duration,
      rate,
      peaks: new Float32Array(Math.min(240000, Math.ceil(duration * rate))),
    };
  }
  add(channels: Float32Array[], timestamp: number, sampleRate: number) {
    const { rate, peaks } = this.data;
    for (let i = 0; i < (channels[0]?.length || 0); i++) {
      const bin = Math.floor((timestamp + i / sampleRate) * rate + 1e-8);
      if (bin < 0 || bin >= peaks.length) continue;
      let peak = peaks[bin];
      for (const channel of channels)
        peak = Math.max(peak, Math.abs(channel[i] || 0));
      peaks[bin] = peak;
    }
  }
}
export class Waveform {
  levels: Float32Array[];
  constructor(public data: WaveformData) {
    this.levels = [data.peaks];
    while (this.levels.at(-1)!.length > 1) {
      const last = this.levels.at(-1)!;
      const next = new Float32Array(Math.ceil(last.length / 2));
      for (let i = 0; i < next.length; i++)
        next[i] = Math.max(last[i * 2], last[i * 2 + 1] || 0);
      this.levels.push(next);
    }
  }
  /** Exact max of the bins intersecting a source interval, in O(log bins). */
  peak(start: number, end: number) {
    if (end <= 0 || start >= this.data.duration || end <= start) return 0;
    let lo = Math.max(0, Math.floor(start * this.data.rate + 1e-8));
    let hi = Math.min(
      this.data.peaks.length,
      Math.ceil(end * this.data.rate - 1e-8),
    );
    let level = 0,
      peak = 0;
    while (lo < hi) {
      if (lo % 2) peak = Math.max(peak, this.levels[level][lo++]);
      if (hi % 2) peak = Math.max(peak, this.levels[level][--hi]);
      lo = Math.floor(lo / 2);
      hi = Math.floor(hi / 2);
      level++;
    }
    return peak;
  }
}
