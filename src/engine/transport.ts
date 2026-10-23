import { duration } from "../core/model";
import { store } from "../core/store";
import { meter } from "../core/performance";
import type { PreviewEngine } from "./client";
class Transport {
  time = 0;
  playing = false;
  listeners = new Set<() => void>();
  engine?: PreviewEngine;
  context?: AudioContext;
  sources = new Set<AudioBufferSourceNode>();
  startClock = 0;
  startTime = 0;
  generation = 0;
  nextAudio = 0;
  pumping = false;
  raf = 0;
  constructor() {
    const tick = (now: number) => {
      meter.tick(now);
      if (this.playing) {
        this.time = Math.max(
          this.startTime,
          this.startTime + (this.context!.currentTime - this.startClock),
        );
        if (this.time >= duration(store.get().project)) {
          this.pause();
          this.time = duration(store.get().project);
        }
        this.emit();
        void this.engine?.draw(this.time).catch((e) => {
          store.patch({ error: e.message });
          this.pause();
        });
        if (this.nextAudio < this.time + 0.7) void this.pump();
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }
  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  };
  emit = () => this.listeners.forEach((l) => l());
  seek(t: number) {
    this.pause();
    this.time = Math.max(0, Math.min(duration(store.get().project), t));
    this.emit();
    void this.engine
      ?.draw(this.time, true)
      .catch((e) => store.patch({ error: e.message }));
  }
  async play() {
    if (this.playing) {
      this.pause();
      return;
    }
    this.context ??= new AudioContext({ sampleRate: 48000 });
    await this.context.resume();
    if (this.time >= duration(store.get().project) - 0.01) this.time = 0;
    this.generation++;
    this.playing = true;
    this.startTime = this.time;
    this.startClock = this.context.currentTime + 0.12;
    this.nextAudio = this.time;
    this.emit();
    await this.engine?.audioClient.call("reset-audio");
    void this.pump();
  }
  async pump() {
    if (this.pumping || !this.playing || !this.engine || !this.context) return;
    this.pumping = true;
    const generation = this.generation;
    try {
      while (
        this.playing &&
        generation === this.generation &&
        this.nextAudio < this.time + 1 &&
        this.nextAudio < duration(store.get().project)
      ) {
        const start = this.nextAudio,
          count = Math.min(
            12000,
            Math.ceil((duration(store.get().project) - start) * 48000),
          );
        const channels = (await this.engine.audioClient.call("audio", {
          project: store.get().project,
          start,
          count,
          rate: 48000,
        })) as Float32Array[];
        if (generation !== this.generation) break;
        const buffer = this.context.createBuffer(2, count, 48000);
        channels.forEach((c, i) =>
          buffer.copyToChannel(new Float32Array(c), i),
        );
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.connect(this.context.destination);
        const when = this.startClock + (start - this.startTime);
        if (when >= this.context.currentTime) {
          source.start(when);
          this.sources.add(source);
          source.onended = () => this.sources.delete(source);
        } else {
          const offset = this.context.currentTime - when;
          if (offset < buffer.duration) {
            source.start(this.context.currentTime, offset);
            this.sources.add(source);
            source.onended = () => this.sources.delete(source);
          }
        }
        this.nextAudio += count / 48000;
      }
    } catch (e) {
      if (generation !== this.generation) return;
      store.patch({ error: `Audio: ${e instanceof Error ? e.message : e}` });
      this.pause();
    } finally {
      this.pumping = false;
    }
  }
  pause() {
    this.playing = false;
    this.generation++;
    this.sources.forEach((s) => {
      try {
        s.stop();
      } catch {
        /* already ended */
      }
    });
    this.sources.clear();
    this.emit();
  }
}
export const transport = new Transport();
