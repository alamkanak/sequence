import { describe, it, expect, vi, afterEach } from "vitest";
import { emptyProject, newClip, validateProject } from "../src/core/model";
import {
  addGradientStop,
  defaultGradient,
  paintStyle,
  configurePaint,
} from "../src/engine/paint";
import { elementPicture } from "../src/engine/scene";
import { elementRegistry } from "../src/engine/elements";
function fixture() {
  const p = emptyProject();
  const c = newClip(p, "shape", p.tracks[0].id, 0);
  p.clips = [c];
  return { p, c };
}
function paintContext() {
  const gradient = { addColorStop: vi.fn() };
  return {
    gradient,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    createLinearGradient: vi.fn(() => gradient),
    createRadialGradient: vi.fn(() => gradient),
    beginPath: vi.fn(),
    roundRect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
  };
}
afterEach(() => vi.unstubAllGlobals());
describe("element paints", () => {
  it("preserves gradient stops and independent opacity through project JSON", () => {
    const { p, c } = fixture();
    c.fillGradient = defaultGradient("#ff0000");
    c.fillGradient.stops[1].opacity = 0.3;
    c.fillOpacity = 0.65;
    c.strokeGradient = { ...defaultGradient("#00ff00"), type: "radial" };
    c.strokeOpacity = 0.4;
    const restored = validateProject(JSON.parse(JSON.stringify(p))).clips[0];
    expect(restored.fillGradient).toEqual(c.fillGradient);
    expect(restored.strokeGradient).toEqual(c.strokeGradient);
    expect(restored.fillOpacity).toBe(0.65);
    expect(restored.strokeOpacity).toBe(0.4);
  });
  it("defaults legacy projects to opaque solid paints without losing their colors", () => {
    const { p, c } = fixture();
    const old = { ...c } as Partial<typeof c>;
    delete old.fillOpacity;
    delete old.strokeOpacity;
    delete old.fillGradient;
    delete old.strokeGradient;
    const restored = validateProject({ ...p, clips: [old] }).clips[0];
    expect(restored.fillOpacity).toBe(1);
    expect(restored.strokeOpacity).toBe(1);
    expect(restored.fillGradient).toBeNull();
    expect(restored.strokeGradient).toBeNull();
    expect(restored.fill).toBe(c.fill);
  });
  it("keeps fill, stroke and overall element opacity independent", () => {
    const { c } = fixture();
    Object.assign(c, {
      fill: "#ff0000",
      stroke: "#00ff00",
      fillOpacity: 0.25,
      strokeOpacity: 0.75,
      opacity: 0.5,
    });
    const ctx = paintContext();
    configurePaint(ctx as any, 200, 100, c);
    expect(ctx.fillStyle).toBe("rgba(255,0,0,0.25)");
    expect(ctx.strokeStyle).toBe("rgba(0,255,0,0.75)");
    expect(c.opacity).toBe(0.5);
  });
  it("sorts gradient stops and multiplies per-stop alpha by paint opacity", () => {
    const ctx = paintContext(),
      g = defaultGradient("#ff0000");
    g.stops = [
      { offset: 1, color: "#ff0000", opacity: 0.4 },
      { offset: 0, color: "#0000ff", opacity: 1 },
    ];
    paintStyle(ctx as any, 200, 100, "#ffffff", 0.5, g);
    expect(ctx.createLinearGradient).toHaveBeenCalledWith(0, 50, 200, 50);
    expect(ctx.gradient.addColorStop.mock.calls).toEqual([
      [0, "rgba(0,0,255,0.5)"],
      [1, "rgba(255,0,0,0.2)"],
    ]);
    expect(g.stops[0].offset).toBe(1);
  });
  it("supports radial gradients and linear angle changes", () => {
    const ctx = paintContext(),
      g = defaultGradient("#ffffff");
    g.type = "radial";
    paintStyle(ctx as any, 200, 100, "#ffffff", 1, g);
    expect(ctx.createRadialGradient).toHaveBeenCalledWith(
      100,
      50,
      0,
      100,
      50,
      Math.hypot(200, 100) / 2,
    );
    g.type = "linear";
    g.angle = 90;
    paintStyle(ctx as any, 200, 100, "#ffffff", 1, g);
    const ends = ctx.createLinearGradient.mock.calls[0] as number[];
    expect(ends[0]).toBeCloseTo(100);
    expect(ends[1]).toBeCloseTo(0);
    expect(ends[2]).toBeCloseTo(100);
    expect(ends[3]).toBeCloseTo(100);
  });
  it("adds an interpolated stop in the largest gap without mutating the gradient", () => {
    const g = defaultGradient("#000000");
    g.stops[1].color = "#ffffff";
    const next = addGradientStop(g);
    expect(next.stops[1]).toEqual({
      offset: 0.5,
      color: "#808080",
      opacity: 1,
    });
    expect(g.stops).toHaveLength(2);
  });
  it("rejects invalid paint values instead of sending them to the renderer", () => {
    const { p, c } = fixture();
    for (const patch of [
      { fillOpacity: 1.1 },
      { strokeOpacity: -0.1 },
      {
        fillGradient: {
          ...defaultGradient(c.fill),
          stops: [
            { offset: 2, color: c.fill, opacity: 1 },
            { offset: 0, color: c.fill, opacity: 1 },
          ],
        },
      },
      { fillGradient: { ...defaultGradient(c.fill), stops: [] } },
    ]) {
      expect(() =>
        validateProject({ ...p, clips: [{ ...c, ...patch }] }),
      ).toThrow();
    }
  });
  it("invalidates cached element textures when opacity or a gradient stop changes", () => {
    const { p, c } = fixture();
    vi.stubGlobal(
      "OffscreenCanvas",
      class {
        width: number;
        height: number;
        ctx = paintContext();
        constructor(w: number, h: number) {
          this.width = w;
          this.height = h;
        }
        getContext() {
          return this.ctx;
        }
      },
    );
    const first = elementPicture(c, p, 0);
    expect(elementPicture(c, p, 0)).toBe(first);
    c.fillOpacity = 0.4;
    const translucent = elementPicture(c, p, 0);
    expect(translucent).not.toBe(first);
    c.fillGradient = defaultGradient(c.fill);
    const gradient = elementPicture(c, p, 0);
    expect(gradient).not.toBe(translucent);
    c.fillGradient.stops[0].opacity = 0.2;
    expect(elementPicture(c, p, 0)).not.toBe(gradient);
  });
  it("paints a visible outline even when the fill is fully transparent", () => {
    const { p, c } = fixture();
    Object.assign(c, { fillOpacity: 0, strokeOpacity: 1, strokeWidth: 5 });
    const ctx = paintContext();
    elementRegistry.get("shape")!.paint!(ctx as any, 200, 100, c, p, 0);
    expect(ctx.fillStyle).toBe("rgba(165,180,252,0)");
    expect(ctx.strokeStyle).toBe("rgba(255,255,255,1)");
    expect(ctx.stroke).toHaveBeenCalledOnce();
  });
});
