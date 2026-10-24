import { useEffect, useId, useRef, useState } from "react";
import { store } from "../core/store";
import { ColorPicker, ColorSwatch } from "./ColorPicker";
import { Field, cn, controlClass, skin } from "./ui";

export function ColorField({
  label,
  ariaLabel,
  value,
  onChange,
}: {
  label: string;
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const session = useRef<{
    original: string;
    color: string;
    projectId: string;
  } | null>(null);
  const finish = (apply: boolean, color = session.current?.color) => {
    const current = session.current;
    session.current = null;
    if (!current || store.get().project.id !== current.projectId) return;
    // Restore the starting color without history, then commit once. Other
    // project changes are preserved because only this field is updated.
    if (current.color !== current.original)
      store.preview(() => onChangeRef.current(current.original));
    if (apply && color && color !== current.original)
      onChangeRef.current(color);
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;
  useEffect(() => () => finishRef.current(true), []);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (root.current?.contains(event.target as Node)) return;
      finishRef.current(true);
      setOpen(false);
    };
    window.addEventListener("pointerdown", outside, true);
    return () => window.removeEventListener("pointerdown", outside, true);
  }, [open]);
  const edited = useRef(false);
  const [hex, setHex] = useState(value.slice(1));
  useEffect(() => {
    setHex(value.slice(1));
    edited.current = false;
  }, [value]);
  const commit = () => {
    if (!edited.current) return;
    edited.current = false;
    const next = hex.replace(/^#/, "").trim();
    if (/^[\da-f]{6}$/i.test(next)) {
      setHex(next.toLowerCase());
      if (`#${next.toLowerCase()}` !== value.toLowerCase())
        onChange(`#${next.toLowerCase()}`);
    } else setHex(value.slice(1));
  };
  return (
    <div
      ref={root}
      className={cn("min-w-0 space-y-2", open && "col-span-full")}
    >
      <Field label={label} htmlFor={id}>
        <div
          className={cn(
            controlClass,
            "flex w-32 max-w-full min-w-0 items-center gap-1 px-1.5 focus-within:border-indigo-500/60 focus-within:ring-2 focus-within:ring-indigo-500/10 [[data-theme=dark]_&]:focus-within:border-indigo-400/60",
          )}
        >
          <button
            type="button"
            aria-label={ariaLabel}
            aria-haspopup="dialog"
            aria-expanded={open}
            title={`Choose ${label.toLowerCase()}`}
            onClick={() => {
              if (open) {
                finish(true);
                setOpen(false);
                return;
              }
              session.current = {
                original: value,
                color: value,
                projectId: store.get().project.id,
              };
              setOpen(true);
            }}
            className="size-[18px] shrink-0 cursor-pointer overflow-hidden rounded border border-black/10 outline-none hover:ring-2 hover:ring-indigo-500/40 focus-visible:ring-2 focus-visible:ring-indigo-500 [[data-theme=dark]_&]:border-white/15"
          >
            <ColorSwatch value={value} />
          </button>
          <div className="flex min-w-0 flex-1 items-center font-mono text-xs">
            <span aria-hidden="true" className={skin.muted}>
              #
            </span>
            <input
              id={id}
              aria-label={`${ariaLabel} hex`}
              value={hex}
              maxLength={7}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => {
                edited.current = true;
                setHex(e.target.value);
              }}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") {
                  edited.current = false;
                  setHex(value.slice(1));
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
              className="h-7 w-full min-w-0 bg-transparent uppercase outline-none"
            />
          </div>
        </div>
      </Field>
      {open && (
        <ColorPicker
          label={label}
          value={session.current?.original || value}
          onPreview={(color) => {
            const current = session.current;
            if (
              !current ||
              current.color === color ||
              current.projectId !== store.get().project.id
            )
              return;
            current.color = color;
            store.preview(() => onChangeRef.current(color));
          }}
          onApply={(color) => {
            finish(true, color);
            setOpen(false);
          }}
          onClose={() => {
            finish(false);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
