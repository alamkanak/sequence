import type { Clip, Project } from "../core/model";
import type { VideoSample } from "mediabunny";
import { elementRegistry } from "./elements";
export interface Pose {
  x: number;
  y: number;
  w: number;
  h: number;
  angle: number;
  alpha: number;
  anchorX: number;
  anchorY: number;
}
export function pose(c: Clip, p: Project, t: number): Pose {
  const local = Math.max(0, t - c.start);
  let x = c.x,
    y = c.y,
    scale = c.scale,
    rotation = c.rotation,
    alpha = c.opacity;
  for (const prop of ["x", "y", "scale", "rotation", "opacity"] as const) {
    const keys = c.keyframes
      .filter((k) => k.property === prop)
      .sort((a, b) => a.time - b.time);
    if (!keys.length) continue;
    let value = keys[0].value;
    for (let i = 0; i < keys.length; i++) {
      const a = keys[i],
        b = keys[i + 1];
      if (local >= a.time) {
        value = a.value;
        if (b && local < b.time) {
          const f = (local - a.time) / (b.time - a.time);
          value = a.value + (b.value - a.value) * f;
          break;
        }
      }
    }
    if (prop === "x") x = value;
    if (prop === "y") y = value;
    if (prop === "scale") scale = value;
    if (prop === "rotation") rotation = value;
    if (prop === "opacity") alpha = value;
  }
  const enter = Math.min(1, local / c.animDuration),
    exit = Math.min(1, (c.duration - local) / c.animDuration);
  if (c.enter === "fade") alpha *= enter;
  if (c.exit === "fade") alpha *= exit;
  if (c.enter === "slide") x -= (1 - enter) * 0.18;
  if (c.exit === "slide") x += (1 - exit) * 0.18;
  if (c.enter === "zoom") scale *= 0.75 + 0.25 * enter;
  if (c.exit === "zoom") scale *= 0.75 + 0.25 * exit;
  if (c.fadeIn) alpha *= Math.min(1, local / c.fadeIn);
  if (c.fadeOut) alpha *= Math.min(1, (c.duration - local) / c.fadeOut);
  return {
    x: x * p.width,
    y: y * p.height,
    w: c.width * p.width * scale,
    h: c.height * p.height * scale,
    angle: (rotation * Math.PI) / 180,
    alpha: Math.max(0, Math.min(1, alpha)),
    anchorX: c.anchorX,
    anchorY: c.anchorY,
  };
}
export function corners(v: Pose): { x: number; y: number }[] {
  const cs = Math.cos(v.angle),
    sn = Math.sin(v.angle);
  return [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ].map(([x, y]) => {
    x = (x - v.anchorX) * v.w;
    y = (y - v.anchorY) * v.h;
    return { x: v.x + x * cs - y * sn, y: v.y + x * sn + y * cs };
  });
}
export function activeClips(p: Project, t: number) {
  const index = new Map(p.tracks.map((tr, i) => [tr.id, i]));
  return p.clips
    .filter(
      (c) =>
        c.kind !== "audio" &&
        t >= c.start &&
        t < c.start + c.duration &&
        !p.tracks.find((tr) => tr.id === c.trackId)?.hidden,
    )
    .sort(
      (a, b) =>
        index.get(b.trackId)! - index.get(a.trackId)! || a.start - b.start,
    );
}
export type Picture = VideoSample | ImageBitmap | OffscreenCanvas;
export function isSample(p: Picture): p is VideoSample {
  return "toVideoFrame" in p;
}
const rasterCache = new Map<string, OffscreenCanvas>();
export function elementPicture(
  c: Clip,
  p: Project,
  t: number,
): OffscreenCanvas {
  const key = JSON.stringify([
    c.kind,
    c.width,
    c.height,
    c.text,
    c.font,
    c.fontSize,
    c.fill,
    c.fillOpacity,
    c.fillGradient,
    c.stroke,
    c.strokeOpacity,
    c.strokeGradient,
    c.strokeWidth,
    c.shape,
    c.radius,
    p.width,
    p.height,
    c.kind === "vector" ? Math.round(t * 30) : 0,
  ]);
  const cached = rasterCache.get(key);
  if (cached) return cached;
  const w = Math.max(2, Math.round(c.width * p.width)),
    h = Math.max(2, Math.round(c.height * p.height));
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d")!;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const definition = elementRegistry.get(c.kind);
  if (!definition?.paint)
    throw new Error(`No renderer registered for ${c.kind}`);
  definition.paint(ctx, w, h, c, p, t);
  rasterCache.set(key, canvas);
  if (rasterCache.size > 96)
    rasterCache.delete(rasterCache.keys().next().value!);
  return canvas;
}
export interface Layer {
  clip: Clip;
  pose: Pose;
  picture: Picture;
}
export interface Renderer {
  canvas: OffscreenCanvas;
  name: string;
  draw(layers: Layer[], p: Project): void;
  dispose(): void;
}
export class CanvasRenderer implements Renderer {
  name = "Canvas 2D";
  ctx: OffscreenCanvasRenderingContext2D;
  constructor(public canvas: OffscreenCanvas) {
    this.ctx = canvas.getContext("2d", { alpha: false })!;
  }
  draw(layers: Layer[], p: Project) {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = p.background;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.scale(this.canvas.width / p.width, this.canvas.height / p.height);
    for (const l of layers) {
      const v = l.pose;
      ctx.save();
      ctx.translate(v.x, v.y);
      ctx.rotate(v.angle);
      ctx.globalAlpha = v.alpha;
      if (isSample(l.picture))
        l.picture.draw(ctx, -v.w * v.anchorX, -v.h * v.anchorY, v.w, v.h);
      else
        ctx.drawImage(l.picture, -v.w * v.anchorX, -v.h * v.anchorY, v.w, v.h);
      ctx.restore();
    }
  }
  dispose() {}
}
// Both pipelines use premultiplied alpha. Video samples stay GPU-resident.
export class GpuRenderer implements Renderer {
  name = "WebGPU";
  device: GPUDevice;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
  sampler: GPUSampler;
  pipelines: GPURenderPipeline[];
  resources = new Map<
    string,
    {
      vertices: GPUBuffer;
      opacity: GPUBuffer;
      texture?: GPUTexture;
      picture?: Picture;
    }
  >();
  constructor(
    public canvas: OffscreenCanvas,
    device: GPUDevice,
  ) {
    this.device = device;
    this.context = canvas.getContext("webgpu")!;
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({
      device,
      format: this.format,
      alphaMode: "opaque",
    });
    this.sampler = device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
    });
    const base = `struct V { @builtin(position) p:vec4f, @location(0) uv:vec2f }; @vertex fn vs(@location(0) p:vec2f,@location(1) uv:vec2f)->V {var o:V;o.p=vec4f(p,0,1);o.uv=uv;return o;} @group(0) @binding(0) var smp:sampler; @group(0) @binding(2) var<uniform> alpha:vec4f;`;
    this.pipelines = [false, true].map((external) => {
      const texture = external ? "texture_external" : "texture_2d<f32>";
      const read = external
        ? "textureSampleBaseClampToEdge(tex,smp,v.uv)"
        : "textureSample(tex,smp,v.uv)";
      const module = device.createShaderModule({
        code:
          base +
          `@group(0) @binding(1) var tex:${texture}; @fragment fn fs(v:V)->@location(0) vec4f {let c=${read};return vec4f(c.rgb*c.a*alpha.x,c.a*alpha.x);}`,
      });
      return device.createRenderPipeline({
        layout: "auto",
        vertex: {
          module,
          entryPoint: "vs",
          buffers: [
            {
              arrayStride: 16,
              attributes: [
                { shaderLocation: 0, offset: 0, format: "float32x2" },
                { shaderLocation: 1, offset: 8, format: "float32x2" },
              ],
            },
          ],
        },
        fragment: {
          module,
          entryPoint: "fs",
          targets: [
            {
              format: this.format,
              blend: {
                color: { srcFactor: "one", dstFactor: "one-minus-src-alpha" },
                alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" },
              },
            },
          ],
        },
        primitive: { topology: "triangle-list" },
      });
    });
  }
  static async create(canvas: OffscreenCanvas) {
    const adapter = await navigator.gpu?.requestAdapter();
    if (!adapter) throw new Error("WebGPU adapter unavailable");
    const device = await adapter.requestDevice();
    device.lost.then(() => {
      postMessage({ type: "gpu-lost" });
    });
    return new GpuRenderer(canvas, device);
  }
  draw(layers: Layer[], p: Project) {
    const d = this.device;
    const rgb = p.background.match(/\w\w/g)!.map((x) => parseInt(x, 16) / 255);
    const encoder = d.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          loadOp: "clear",
          storeOp: "store",
          clearValue: { r: rgb[0], g: rgb[1], b: rgb[2], a: 1 },
        },
      ],
    });
    const frames: VideoFrame[] = [];
    for (const l of layers) {
      let r = this.resources.get(l.clip.id);
      if (!r) {
        r = {
          vertices: d.createBuffer({
            size: 96,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
          }),
          opacity: d.createBuffer({
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
          }),
        };
        this.resources.set(l.clip.id, r);
      }
      const v = corners(l.pose);
      const vertices = new Float32Array(
        [0, 1, 2, 0, 2, 3].flatMap((i) => [
          (v[i].x / p.width) * 2 - 1,
          1 - (v[i].y / p.height) * 2,
          ...[
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
          ][i],
        ]),
      );
      d.queue.writeBuffer(r.vertices, 0, vertices);
      d.queue.writeBuffer(
        r.opacity,
        0,
        new Float32Array([l.pose.alpha, 0, 0, 0]),
      );
      let texture: GPUExternalTexture | GPUTextureView;
      const external =
        isSample(l.picture) && l.picture.rotation === 0 && !l.picture.flip;
      if (external) {
        const frame = (l.picture as VideoSample).toVideoFrame();
        frames.push(frame);
        texture = d.importExternalTexture({ source: frame });
      } else {
        let pic: ImageBitmap | OffscreenCanvas;
        if (isSample(l.picture)) {
          pic = new OffscreenCanvas(
            l.picture.displayWidth,
            l.picture.displayHeight,
          );
          l.picture.draw(pic.getContext("2d")!, 0, 0);
        } else pic = l.picture;
        if (r.picture !== l.picture) {
          r.texture?.destroy();
          r.texture = d.createTexture({
            size: [pic.width, pic.height],
            format: "rgba8unorm",
            usage:
              GPUTextureUsage.TEXTURE_BINDING |
              GPUTextureUsage.COPY_DST |
              GPUTextureUsage.RENDER_ATTACHMENT,
          });
          d.queue.copyExternalImageToTexture(
            { source: pic },
            { texture: r.texture },
            [pic.width, pic.height],
          );
          r.picture = l.picture;
        }
        texture = r.texture!.createView();
      }
      const pipeline = this.pipelines[external ? 1 : 0];
      pass.setPipeline(pipeline);
      pass.setVertexBuffer(0, r.vertices);
      pass.setBindGroup(
        0,
        d.createBindGroup({
          layout: pipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: this.sampler },
            { binding: 1, resource: texture },
            { binding: 2, resource: { buffer: r.opacity } },
          ],
        }),
      );
      pass.draw(6);
    }
    pass.end();
    d.queue.submit([encoder.finish()]);
    frames.forEach((f) => f.close());
    for (const [id, r] of this.resources)
      if (!layers.some((l) => l.clip.id === id)) {
        r.texture?.destroy();
        r.vertices.destroy();
        r.opacity.destroy();
        this.resources.delete(id);
      }
  }
  dispose() {
    for (const r of this.resources.values()) {
      r.texture?.destroy();
      r.vertices.destroy();
      r.opacity.destroy();
    }
    this.context.unconfigure();
    this.device.destroy();
  }
}
export async function makeRenderer(
  canvas: OffscreenCanvas,
  preferGpu = true,
): Promise<Renderer> {
  if (preferGpu && navigator.gpu) {
    try {
      return await GpuRenderer.create(canvas);
    } catch (e) {
      console.warn("WebGPU unavailable", e);
    }
  }
  return new CanvasRenderer(canvas);
}
