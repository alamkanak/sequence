import { useEffect, useRef, useState } from "react";
import {
  hexToHsv,
  hexToRgb,
  hsvToHex,
  rgbToHex,
  type HSV,
} from "../core/color";
import { XIcon } from "./icons";
import { Button, Field, IconButton, Input, cn, skin } from "./ui";
import { NumberField } from "./NumberField";

export function ColorSwatch({ value }: { value: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (context) {
      context.fillStyle = value;
      context.fillRect(0, 0, 40, 40);
    }
  }, [value]);
  return (
    <canvas
      ref={canvas}
      width={40}
      height={40}
      aria-hidden="true"
      className="pointer-events-none size-full"
    />
  );
}

export function ColorPicker({
  label,
  value,
  onApply,
  onPreview,
  onClose,
}: {
  label: string;
  value: string;
  onApply: (value: string) => void;
  onPreview: (value: string) => void;
  onClose: () => void;
}) {
  const [hsv, setHsv] = useState(() => hexToHsv(value));
  const color = hsvToHex(hsv);
  const [hex, setHex] = useState(color.slice(1));
  const root = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const spectrum = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement;
    spectrum.current?.focus({ preventScroll: true });
    root.current?.scrollIntoView({ block: "nearest" });
    const escape = (event: KeyboardEvent) => {
      if (
        event.key !== "Escape" ||
        event.defaultPrevented ||
        Array.from(document.querySelectorAll('[role="dialog"]')).at(-1) !==
          root.current
      )
        return;
      event.preventDefault();
      closeRef.current();
    };
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("keydown", escape);
      if (trigger?.isConnected && document.activeElement === document.body)
        trigger.focus({ preventScroll: true });
    };
  }, []);
  const hue = useRef<HTMLCanvasElement>(null);
  const rgb = hexToRgb(color);
  useEffect(() => {
    setHex(color.slice(1));
  }, [color]);
  useEffect(() => {
    const context = spectrum.current?.getContext("2d");
    if (!context) return;
    const width = 400,
      height = 220;
    context.fillStyle = hsvToHex({ h: hsv.h, s: 1, v: 1 });
    context.fillRect(0, 0, width, height);
    const white = context.createLinearGradient(0, 0, width, 0);
    white.addColorStop(0, "white");
    white.addColorStop(1, "transparent");
    context.fillStyle = white;
    context.fillRect(0, 0, width, height);
    const black = context.createLinearGradient(0, 0, 0, height);
    black.addColorStop(0, "transparent");
    black.addColorStop(1, "black");
    context.fillStyle = black;
    context.fillRect(0, 0, width, height);
    const x = Math.max(7, Math.min(width - 7, hsv.s * width));
    const y = Math.max(7, Math.min(height - 7, (1 - hsv.v) * height));
    context.beginPath();
    context.arc(x, y, 5, 0, Math.PI * 2);
    context.lineWidth = 4;
    context.strokeStyle = "#18181b";
    context.stroke();
    context.lineWidth = 2;
    context.strokeStyle = "white";
    context.stroke();
  }, [hsv]);
  useEffect(() => {
    const context = hue.current?.getContext("2d");
    if (!context) return;
    const gradient = context.createLinearGradient(0, 0, 400, 0);
    for (let stop = 0; stop <= 6; stop++)
      gradient.addColorStop(stop / 6, `hsl(${stop * 60},100%,50%)`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, 400, 20);
  }, []);
  const update = (next: HSV) => {
    setHsv(next);
    onPreview(hsvToHex(next));
  };
  const change = (patch: Partial<HSV>) => update({ ...hsv, ...patch });
  function commitHex() {
    const next = hex.replace(/^#/, "").trim();
    if (/^[\da-f]{6}$/i.test(next)) {
      update(hexToHsv(`#${next}`));
      setHex(next.toLowerCase());
      return `#${next.toLowerCase()}`;
    }
    setHex(color.slice(1));
    return color;
  }
  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    change({
      s: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      v: 1 - Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    });
  };
  return (
    <div
      ref={root}
      role="dialog"
      aria-modal="false"
      aria-label={`Choose ${label.toLowerCase()}`}
      className={cn(
        "@container space-y-3 rounded-lg border p-3",
        skin.border,
        skin.raised,
      )}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.defaultPrevented) {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-medium">{label}</h4>
        <IconButton label="Close color picker" size="xs" onClick={onClose}>
          <XIcon size={16} />
        </IconButton>
      </div>
      <div className="space-y-3">
        <canvas
          ref={spectrum}
          width={400}
          height={220}
          tabIndex={0}
          role="slider"
          aria-label="Color spectrum"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(hsv.v * 100)}
          aria-valuetext={`Saturation ${Math.round(hsv.s * 100)}%, brightness ${Math.round(hsv.v * 100)}%. Use left and right for saturation, up and down for brightness.`}
          className="h-32 w-full touch-none cursor-crosshair rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            event.currentTarget.focus();
            point(event);
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              point(event);
          }}
          onKeyDown={(event) => {
            const step = event.shiftKey ? 0.1 : 0.01;
            if (
              ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                event.key,
              )
            ) {
              event.preventDefault();
              change({
                s: Math.max(
                  0,
                  Math.min(
                    1,
                    hsv.s +
                      (event.key === "ArrowRight"
                        ? step
                        : event.key === "ArrowLeft"
                          ? -step
                          : 0),
                  ),
                ),
                v: Math.max(
                  0,
                  Math.min(
                    1,
                    hsv.v +
                      (event.key === "ArrowUp"
                        ? step
                        : event.key === "ArrowDown"
                          ? -step
                          : 0),
                  ),
                ),
              });
            }
          }}
        />
        <Field label="Hue">
          <div className="relative h-5">
            <canvas
              ref={hue}
              width={400}
              height={20}
              aria-hidden="true"
              className="absolute inset-0 h-5 w-full rounded-md"
            />
            <input
              type="range"
              aria-label="Hue"
              min={0}
              max={360}
              value={hsv.h}
              onChange={(event) => change({ h: +event.target.value })}
              className="relative h-5 w-full cursor-pointer appearance-none rounded-md bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-2 [&::-moz-range-thumb]:rounded-sm [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-zinc-700 [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-sm [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-zinc-700 [&::-webkit-slider-thumb]:bg-white"
            />
          </div>
        </Field>
        <div className="grid grid-cols-2 items-end gap-3">
          <Field label="Hex">
            <Input
              aria-label="Picker hex"
              value={hex}
              maxLength={7}
              spellCheck={false}
              onChange={(event) => {
                const draft = event.target.value;
                setHex(draft);
                const next = draft.replace(/^#/, "").trim();
                if (/^[\da-f]{6}$/i.test(next)) update(hexToHsv(`#${next}`));
              }}
              onBlur={commitHex}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.currentTarget.blur();
                }
              }}
              className="font-mono uppercase"
            />
          </Field>
          <Field label="Before / After">
            <div className="flex h-8">
              <div
                className={cn(
                  "flex flex-1 overflow-hidden rounded-md border",
                  skin.border,
                )}
              >
                <ColorSwatch value={value} />
                <ColorSwatch value={color} />
              </div>
            </div>
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-2 @[160px]:grid-cols-3">
          {(["Red", "Green", "Blue"] as const).map((channel, index) => (
            <NumberField
              key={channel}
              label={channel}
              ariaLabel={`Picker ${channel.toLowerCase()}`}
              value={rgb[index]}
              min={0}
              max={255}
              step={1}
              onChange={(value) =>
                update(
                  hexToHsv(
                    rgbToHex(
                      rgb.map((current, at) =>
                        at === index ? value : current,
                      ),
                    ),
                  ),
                )
              }
            />
          ))}
        </div>
        <div
          className={cn(
            "flex flex-wrap justify-end gap-2 border-t pt-3",
            skin.border,
          )}
        >
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            aria-label="Apply color"
            onClick={() => {
              onApply(commitHex());
            }}
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}
