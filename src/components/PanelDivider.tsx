import { useEffect, useRef, useState } from "react";
import { cn } from "./ui";
import { panelPixels } from "./panel-sizes";
export function usePanelSize(
  key: string,
  initial: number,
  min: number,
  max: number,
) {
  const [value, setValue] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(`sequence-panel-${key}`));
      return saved ? panelPixels(saved, min, max) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(`sequence-panel-${key}`, String(value));
      } catch {
        /* Optional preference storage. */
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [key, value]);
  return [value, setValue] as const;
}
export function PanelDivider({
  label,
  orientation = "vertical",
  value,
  min,
  max,
  initial,
  invert = false,
  onChange,
}: {
  label: string;
  orientation?: "vertical" | "horizontal";
  value: number;
  min: number;
  max: number;
  initial: number;
  invert?: boolean;
  onChange: (value: number) => void;
}) {
  const drag = useRef<{ origin: number; value: number; next: number } | null>(
    null,
  );
  const frame = useRef(0);
  const latest = useRef(onChange);
  latest.current = onChange;
  const horizontal = orientation === "horizontal";
  const finish = () => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    if (drag.current) latest.current(drag.current.next);
    drag.current = null;
  };
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation={orientation}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={Math.floor(max / 4) * 4}
      title="Drag to resize · double-click to reset"
      className={cn(
        "relative z-20 shrink-0 touch-none bg-zinc-200 outline-none hover:bg-indigo-400 focus-visible:bg-indigo-400 [[data-theme=dark]_&]:bg-white/[0.08] [[data-theme=dark]_&]:hover:bg-indigo-400 [[data-theme=dark]_&]:focus-visible:bg-indigo-400",
        horizontal
          ? "h-px cursor-row-resize after:absolute after:inset-x-0 after:-inset-y-1"
          : "w-px cursor-col-resize after:absolute after:inset-y-0 after:-inset-x-1",
      )}
      onDoubleClick={() => onChange(panelPixels(initial, min, max))}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        drag.current = {
          origin: horizontal ? e.clientY : e.clientX,
          value,
          next: value,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        d.next = panelPixels(
          d.value +
            ((horizontal ? e.clientY : e.clientX) - d.origin) *
              (invert ? -1 : 1),
          min,
          max,
        );
        if (!frame.current)
          frame.current = requestAnimationFrame(() => {
            frame.current = 0;
            if (drag.current) latest.current(drag.current.next);
          });
      }}
      onPointerUp={finish}
      onPointerCancel={finish}
      onLostPointerCapture={finish}
      onKeyDown={(e) => {
        const back = horizontal ? "ArrowUp" : "ArrowLeft",
          forward = horizontal ? "ArrowDown" : "ArrowRight";
        if (![back, forward, "Home", "End"].includes(e.key)) return;
        e.preventDefault();
        e.stopPropagation();
        onChange(
          panelPixels(
            e.key === "Home"
              ? min
              : e.key === "End"
                ? max
                : value + (e.key === forward ? 16 : -16) * (invert ? -1 : 1),
            min,
            max,
          ),
        );
      }}
    />
  );
}
