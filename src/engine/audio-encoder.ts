import {
  AudioSample,
  EncodedAudioPacketSource,
  EncodedPacket,
  type Output,
} from "mediabunny";
/** WebCodecs AAC can emit unreported encoder priming. Measure it instead of assuming a device-specific constant. */
async function measureAacDelay(config: AudioEncoderConfig): Promise<number> {
  if (typeof AudioDecoder === "undefined") return 0;
  const chunks: EncodedAudioChunk[] = [];
  let decoderConfig: AudioDecoderConfig | undefined;
  let error: Error | undefined;
  const encoder = new AudioEncoder({
    output: (chunk, meta) => {
      chunks.push(chunk);
      if (meta?.decoderConfig) decoderConfig = meta.decoderConfig;
    },
    error: (e) => {
      error = e;
    },
  });
  let decoder: AudioDecoder | undefined;
  try {
    encoder.configure(config);
    const rate = config.sampleRate,
      count = 16384,
      impulse = 4096;
    const samples = new Float32Array(count * 2);
    samples[impulse] = samples[count + impulse] = 0.8;
    const data = new AudioData({
      format: "f32-planar",
      sampleRate: rate,
      numberOfFrames: count,
      numberOfChannels: 2,
      timestamp: 0,
      data: samples,
    });
    encoder.encode(data);
    data.close();
    await encoder.flush();
    if (error || !decoderConfig) return 0;
    let peak = 0,
      peakTime = 0;
    decoder = new AudioDecoder({
      output: (data) => {
        const values = new Float32Array(data.numberOfFrames);
        data.copyTo(values, { planeIndex: 0, format: "f32-planar" });
        for (let i = 0; i < values.length; i++)
          if (Math.abs(values[i]) > peak) {
            peak = Math.abs(values[i]);
            peakTime = data.timestamp / 1e6 + i / data.sampleRate;
          }
        data.close();
      },
      error: (e) => {
        error = e;
      },
    });
    decoder.configure(decoderConfig);
    chunks.forEach((chunk) => decoder!.decode(chunk));
    await decoder.flush();
    if (error || peak < 0.01) return 0;
    const delay = Math.round((peakTime - impulse / rate) * rate) / rate;
    return delay >= 0 && delay < 0.2 ? delay : 0;
  } catch {
    return 0;
  } finally {
    if (encoder.state !== "closed") encoder.close();
    if (decoder && decoder.state !== "closed") decoder.close();
  }
}
export class NativeAudioTrack {
  source: EncodedAudioPacketSource;
  encoder: AudioEncoder;
  pending = Promise.resolve();
  error?: Error;
  delay = 0;
  private constructor(
    output: Output,
    public total: number,
    public codec: "aac" | "opus",
  ) {
    this.source = new EncodedAudioPacketSource(codec);
    output.addAudioTrack(this.source, {
      maximumPacketCount: Math.ceil(((total * 48000) / 512) * 1.4) + 32,
    });
    this.encoder = new AudioEncoder({
      output: (chunk, meta) => {
        const timestamp = chunk.timestamp / 1e6 - this.delay;
        if (timestamp >= total) return;
        const rawDuration =
          (chunk.duration ?? (codec === "aac" ? (1024 / 48000) * 1e6 : 20000)) /
          1e6;
        const duration = Math.min(rawDuration, total - timestamp);
        const bytes = new Uint8Array(chunk.byteLength);
        chunk.copyTo(bytes);
        const packet = new EncodedPacket(bytes, "key", timestamp, duration);
        this.pending = this.pending
          .then(() => this.source.add(packet, meta))
          .catch((e) => {
            this.error = e;
          });
      },
      error: (e) => {
        this.error = e;
      },
    });
  }
  static async create(output: Output, total: number, codec: "aac" | "opus") {
    const config: AudioEncoderConfig = {
      codec: codec === "aac" ? "mp4a.40.2" : "opus",
      sampleRate: 48000,
      numberOfChannels: 2,
      bitrate: 192000,
    };
    const track = new NativeAudioTrack(output, total, codec);
    if (codec === "aac") track.delay = await measureAacDelay(config);
    track.encoder.configure(config);
    return track;
  }
  async add(sample: AudioSample) {
    if (this.error) throw this.error;
    const data = sample.toAudioData();
    this.encoder.encode(data);
    data.close();
    while (this.encoder.encodeQueueSize > 4)
      await new Promise<void>((resolve) =>
        this.encoder.addEventListener("dequeue", () => resolve(), {
          once: true,
        }),
      );
    await this.pending;
    if (this.error) throw this.error;
  }
  async finish() {
    await this.encoder.flush();
    await this.pending;
    if (this.error) throw this.error;
    this.source.close();
    this.encoder.close();
  }
  abort() {
    if (this.encoder.state !== "closed") this.encoder.close();
  }
}
