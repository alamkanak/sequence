import type { Gradient, GradientStop } from "../core/model";
import { defaultGradient, addGradientStop } from "../engine/paint";
import { Button, IconButton, cn, skin } from "./ui";
import { Select } from "./Select";
import { ColorField } from "./ColorField";
import { NumberField } from "./NumberField";
import { PlusIcon, TrashIcon } from "./icons";
export function PaintControls({
  label,
  color,
  opacity,
  gradient,
  onChange,
}: {
  label: string;
  color: string;
  opacity: number;
  gradient: Gradient | null;
  onChange: (value: {
    color: string;
    opacity: number;
    gradient: Gradient | null;
  }) => void;
}) {
  const change = (
    value: Partial<{
      color: string;
      opacity: number;
      gradient: Gradient | null;
    }>,
  ) => onChange({ color, opacity, gradient, ...value });
  const updateStop = (index: number, patch: Partial<GradientStop>) =>
    change({
      gradient: {
        ...gradient!,
        stops: gradient!.stops.map((s, i) =>
          i === index ? { ...s, ...patch } : s,
        ),
      },
    });
  return (
    <div
      className={cn("@container space-y-3 rounded-lg border p-3", skin.border)}
    >
      <p className="text-xs font-medium">{label}</p>
      <Select
        label={`${label} style`}
        value={gradient?.type || "solid"}
        options={[
          { value: "solid", label: "Solid" },
          { value: "linear", label: "Linear gradient" },
          { value: "radial", label: "Radial gradient" },
        ]}
        onChange={(type) =>
          change({
            gradient:
              type === "solid"
                ? null
                : {
                    ...(gradient || defaultGradient(color)),
                    type: type as Gradient["type"],
                  },
          })
        }
      />
      <div className="grid grid-cols-1 gap-2 @[180px]:grid-cols-2">
        {!gradient && (
          <ColorField
            label="Color"
            ariaLabel={`${label} color`}
            value={color}
            onChange={(color) => change({ color })}
          />
        )}
        <NumberField
          label="Opacity (%)"
          ariaLabel={`${label} opacity (%)`}
          value={opacity * 100}
          min={0}
          max={100}
          step={1}
          onChange={(value) => change({ opacity: value / 100 })}
        />
        {gradient?.type === "linear" && (
          <NumberField
            label="Angle (°)"
            ariaLabel={`${label} gradient angle (°)`}
            value={gradient.angle}
            onChange={(angle) => change({ gradient: { ...gradient, angle } })}
          />
        )}
      </div>
      {gradient && (
        <>
          {gradient.stops.map((stop, index) => (
            <div
              key={index}
              className="grid grid-cols-1 items-end gap-2 border-t pt-3 border-zinc-200 @[180px]:grid-cols-2 [[data-theme=dark]_&]:border-white/10"
            >
              <ColorField
                label={`Stop ${index + 1}`}
                ariaLabel={`${label} stop ${index + 1} color`}
                value={stop.color}
                onChange={(color) => updateStop(index, { color })}
              />
              <NumberField
                label="Pos. (%)"
                ariaLabel={`${label} stop ${index + 1} position (%)`}
                value={stop.offset * 100}
                min={0}
                max={100}
                step={1}
                onChange={(value) => updateStop(index, { offset: value / 100 })}
              />
              <NumberField
                label="Alpha (%)"
                ariaLabel={`${label} stop ${index + 1} opacity (%)`}
                value={stop.opacity * 100}
                min={0}
                max={100}
                step={1}
                onChange={(value) =>
                  updateStop(index, { opacity: value / 100 })
                }
              />
              <IconButton
                label={`Remove ${label.toLowerCase()} stop ${index + 1}`}
                size="sm"
                className="justify-self-end"
                disabled={gradient.stops.length <= 2}
                onClick={() =>
                  change({
                    gradient: {
                      ...gradient,
                      stops: gradient.stops.filter((_, i) => i !== index),
                    },
                  })
                }
              >
                <TrashIcon size={15} />
              </IconButton>
            </div>
          ))}
          <Button
            variant="ghost"
            className="w-full"
            disabled={gradient.stops.length >= 8}
            onClick={() => change({ gradient: addGradientStop(gradient) })}
          >
            <PlusIcon size={15} />
            Add {label.toLowerCase()} stop
          </Button>
        </>
      )}
    </div>
  );
}
