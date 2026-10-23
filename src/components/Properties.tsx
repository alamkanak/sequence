import { useState } from "react";
import { NumberField } from "./NumberField";
import { ColorField } from "./ColorField";
import { Select } from "./Select";
import { VolumeControls } from "./VolumeControls";
import { PaintControls } from "./PaintControls";
import {
  SlidersHorizontalIcon,
  DiamondIcon,
  TrashIcon,
  CopyIcon,
} from "./icons";
import { store, useStore } from "../core/store";
import { transport } from "../engine/transport";
import { duplicateClip } from "../core/actions";
import { type Clip, type Motion } from "../core/model";
import { Button, Field, Input, Section, skin, cn, IconButton } from "./ui";
const motions = [
  { value: "none", label: "None" },
  { value: "fade", label: "Fade" },
  { value: "slide", label: "Slide horizontally" },
  { value: "zoom", label: "Scale" },
];
export function Properties({ widthClass = "w-60" }: { widthClass?: string }) {
  const { project: p, selected } = useStore();
  const c = p.clips.find((c) => c.id === selected);
  const patch = (values: Partial<Clip>) =>
    store.safe(() =>
      store.apply([{ op: "update_clip", id: c!.id, patch: values }]),
    );
  const [transition, setTransition] = useState(0.5);
  const projectPatch = (values: Partial<typeof p>) =>
    store.safe(() => store.apply([{ op: "project", patch: values }]));
  return (
    <aside
      aria-label="Properties"
      className={cn(
        "flex min-h-0 shrink-0 flex-col",
        widthClass,
        skin.panel,
        skin.border,
      )}
    >
      <div
        className={cn(
          "flex h-10 shrink-0 items-center gap-2 border-b px-4 text-xs",
          skin.border,
        )}
      >
        <SlidersHorizontalIcon size={14} />
        {c ? "Segment properties" : "Project settings"}
      </div>
      <div key={c?.id || "project"} className="min-h-0 flex-1 overflow-y-auto">
        {!c ? (
          <>
            <Section title="Your project">
              <Field label="Project name">
                <Input
                  aria-label="Project name"
                  value={p.name}
                  onChange={(e) => projectPatch({ name: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <NumberField
                  label="Width"
                  value={p.width}
                  min={16}
                  max={7680}
                  step={2}
                  onChange={(width) =>
                    projectPatch({ width: Math.round(width / 2) * 2 })
                  }
                />
                <NumberField
                  label="Height"
                  value={p.height}
                  min={16}
                  max={7680}
                  step={2}
                  onChange={(height) =>
                    projectPatch({ height: Math.round(height / 2) * 2 })
                  }
                />
              </div>
              <Select
                label="Aspect ratio"
                value="custom"
                onChange={(v) => {
                  if (v !== "custom") {
                    const [w, h] = v.split(":").map(Number);
                    projectPatch({
                      height: Math.round((p.width * h) / w / 2) * 2,
                    });
                  }
                }}
                options={[
                  { value: "custom", label: `${p.width} × ${p.height}` },
                  { value: "16:9", label: "16:9 · Landscape" },
                  { value: "9:16", label: "9:16 · Vertical" },
                  { value: "1:1", label: "1:1 · Square" },
                  { value: "4:3", label: "4:3 · Classic" },
                ]}
              />
              <NumberField
                label="Frame rate"
                value={p.fps}
                min={1}
                max={120}
                step={1}
                onChange={(fps) => projectPatch({ fps })}
              />
              <ColorField
                label="Canvas color"
                ariaLabel="Canvas color"
                value={p.background}
                onChange={(background) => projectPatch({ background })}
              />
            </Section>
            <div className={cn("p-4 text-xs leading-relaxed", skin.muted)}>
              Select a segment to adjust its timing, appearance, and animation.
              <div className={cn("mt-5 rounded-lg border p-3", skin.border)}>
                <p className="mb-2 font-medium">A few useful shortcuts</p>
                <div className="space-y-2 text-xs">
                  <p>
                    Space <span className="float-right">Play / pause</span>
                  </p>
                  <p>
                    S <span className="float-right">Split segment</span>
                  </p>
                  <p>
                    Delete <span className="float-right">Remove segment</span>
                  </p>
                  <p>
                    ⌘ Z <span className="float-right">Undo</span>
                  </p>
                  <p>
                    ← / → <span className="float-right">One frame</span>
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <Section title="Segment">
              <Field label="Name">
                <Input
                  aria-label="Segment name"
                  value={c.name}
                  onChange={(e) => patch({ name: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <NumberField
                  label="Start (s)"
                  value={c.start}
                  min={0}
                  onChange={(start) => patch({ start })}
                />
                <NumberField
                  label="Duration (s)"
                  value={c.duration}
                  min={1 / p.fps}
                  onChange={(duration) => patch({ duration })}
                />
              </div>
              {c.assetId && (
                <div className="grid grid-cols-2 gap-2">
                  <NumberField
                    label="Source in (s)"
                    value={c.in}
                    min={0}
                    onChange={(value) => patch({ in: value })}
                  />
                  <NumberField
                    label="Speed"
                    value={c.speed}
                    min={0.1}
                    max={8}
                    step={0.1}
                    onChange={(speed) =>
                      patch({ speed, duration: (c.duration * c.speed) / speed })
                    }
                  />
                </div>
              )}
            </Section>
            {c.kind !== "audio" && (
              <>
                <Section title="Transform">
                  <div className="grid grid-cols-2 gap-2">
                    <NumberField
                      label="X (%)"
                      value={c.x * 100}
                      onChange={(x) => patch({ x: x / 100 })}
                    />
                    <NumberField
                      label="Y (%)"
                      value={c.y * 100}
                      onChange={(y) => patch({ y: y / 100 })}
                    />
                    <NumberField
                      label="Width (%)"
                      value={c.width * 100}
                      min={1}
                      onChange={(width) => patch({ width: width / 100 })}
                    />
                    <NumberField
                      label="Height (%)"
                      value={c.height * 100}
                      min={1}
                      onChange={(height) => patch({ height: height / 100 })}
                    />
                    <NumberField
                      label="Scale (%)"
                      value={c.scale * 100}
                      min={1}
                      onChange={(scale) => patch({ scale: scale / 100 })}
                    />
                    <NumberField
                      label="Rotation (°)"
                      value={c.rotation}
                      onChange={(rotation) => patch({ rotation })}
                    />
                    <NumberField
                      label="Anchor X (%)"
                      value={c.anchorX * 100}
                      onChange={(anchorX) => patch({ anchorX: anchorX / 100 })}
                    />
                    <NumberField
                      label="Anchor Y (%)"
                      value={c.anchorY * 100}
                      onChange={(anchorY) => patch({ anchorY: anchorY / 100 })}
                    />
                  </div>
                  <NumberField
                    label="Opacity (%)"
                    value={c.opacity * 100}
                    min={0}
                    max={100}
                    step={1}
                    onChange={(opacity) => patch({ opacity: opacity / 100 })}
                  />
                  <p className={cn("text-xs leading-relaxed", skin.muted)}>
                    Corners keep proportions; sides resize one dimension. Shift
                    frees the ratio; Option/Alt resizes from the center.
                  </p>
                </Section>
                {c.kind === "text" && (
                  <Section title="Text">
                    <Field label="Text content">
                      <textarea
                        aria-label="Text content"
                        value={c.text}
                        rows={3}
                        onChange={(e) => patch({ text: e.target.value })}
                        className={cn(
                          "w-full resize-y rounded-lg p-2 text-xs outline-none",
                          skin.input,
                        )}
                      />
                    </Field>
                    <Select
                      label="Typeface"
                      value={c.font}
                      onChange={(font) => patch({ font })}
                      options={[
                        { value: "sans-serif", label: "Sans serif" },
                        { value: "serif", label: "Serif" },
                        { value: "monospace", label: "Monospace" },
                      ]}
                    />
                    <NumberField
                      label="Font size"
                      value={c.fontSize}
                      min={4}
                      onChange={(fontSize) => patch({ fontSize })}
                    />
                  </Section>
                )}
                {["shape", "text", "vector"].includes(c.kind) && (
                  <Section title="Appearance">
                    <PaintControls
                      label="Fill"
                      color={c.fill}
                      opacity={c.fillOpacity}
                      gradient={c.fillGradient}
                      onChange={(value) =>
                        patch({
                          fill: value.color,
                          fillOpacity: value.opacity,
                          fillGradient: value.gradient,
                        })
                      }
                    />
                    <PaintControls
                      label="Stroke"
                      color={c.stroke}
                      opacity={c.strokeOpacity}
                      gradient={c.strokeGradient}
                      onChange={(value) =>
                        patch({
                          stroke: value.color,
                          strokeOpacity: value.opacity,
                          strokeGradient: value.gradient,
                        })
                      }
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <NumberField
                        label="Stroke width"
                        value={c.strokeWidth}
                        min={0}
                        onChange={(strokeWidth) => patch({ strokeWidth })}
                      />
                      {c.kind === "shape" && (
                        <NumberField
                          label="Corner radius"
                          value={c.radius}
                          min={0}
                          onChange={(radius) => patch({ radius })}
                        />
                      )}
                    </div>
                  </Section>
                )}
                <Section title="Animation">
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      label="Enter"
                      value={c.enter}
                      options={motions}
                      onChange={(enter) => patch({ enter: enter as Motion })}
                    />
                    <Select
                      label="Exit"
                      value={c.exit}
                      options={motions}
                      onChange={(exit) => patch({ exit: exit as Motion })}
                    />
                  </div>
                  <NumberField
                    label="Animation duration (s)"
                    value={c.animDuration}
                    min={0.05}
                    onChange={(animDuration) => patch({ animDuration })}
                  />
                  <Button
                    className="w-full"
                    onClick={() => {
                      const time = Math.max(0, transport.time - c.start);
                      const keyframes = c.keyframes.filter(
                        (k) => Math.abs(k.time - time) > 0.01,
                      );
                      patch({
                        keyframes: [
                          ...keyframes,
                          ...(
                            ["x", "y", "scale", "rotation", "opacity"] as const
                          ).map((property) => ({
                            property,
                            time,
                            value: c[property],
                          })),
                        ],
                      });
                    }}
                  >
                    <DiamondIcon size={13} />
                    Keyframe current transform
                  </Button>
                  {c.keyframes.length > 0 && (
                    <Button
                      variant="ghost"
                      onClick={() => patch({ keyframes: [] })}
                    >
                      Clear {c.keyframes.length / 5} keyframe points
                    </Button>
                  )}
                </Section>
                <Section title="Transition from previous clip">
                  <NumberField
                    label="Dissolve duration (s)"
                    value={transition}
                    min={0}
                    max={3}
                    onChange={setTransition}
                  />
                  <Button
                    className="w-full"
                    onClick={() =>
                      store.safe(() =>
                        store.apply([
                          { op: "transition", id: c.id, seconds: transition },
                        ]),
                      )
                    }
                  >
                    Apply cross dissolve
                  </Button>
                </Section>
              </>
            )}
            {(c.kind === "audio" ||
              p.assets.find((a) => a.id === c.assetId)?.hasAudio) && (
              <Section title="Audio">
                <VolumeControls clip={c} onChange={patch} />
                <p className={cn("text-xs", skin.muted)}>
                  Speed changes also change pitch.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <NumberField
                    label="Fade in (s)"
                    value={c.fadeIn}
                    min={0}
                    onChange={(fadeIn) => patch({ fadeIn })}
                  />
                  <NumberField
                    label="Fade out (s)"
                    value={c.fadeOut}
                    min={0}
                    onChange={(fadeOut) => patch({ fadeOut })}
                  />
                </div>
              </Section>
            )}
            <Section title="Actions">
              <div className="flex gap-2">
                <Button onClick={duplicateClip}>
                  <CopyIcon size={13} />
                  Duplicate
                </Button>
                <Button
                  variant="danger"
                  onClick={() =>
                    store.safe(() => {
                      store.apply([{ op: "delete_clip", id: c.id }]);
                      store.patch({ selected: null });
                    })
                  }
                >
                  <TrashIcon size={13} />
                  Remove
                </Button>
              </div>
            </Section>
          </>
        )}
      </div>
    </aside>
  );
}
