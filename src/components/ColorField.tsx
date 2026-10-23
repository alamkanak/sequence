import { useEffect, useId, useRef, useState } from "react";
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
    <Field label={label} htmlFor={id}>
      <div
        className={cn(
          controlClass,
          "flex w-32 max-w-full min-w-0 items-center gap-1 px-1.5 focus-within:border-indigo-500/60 focus-within:ring-2 focus-within:ring-indigo-500/10 [[data-theme=dark]_&]:focus-within:border-indigo-400/60",
        )}
      >
        <input
          type="color"
          aria-label={ariaLabel}
          title={`Choose ${label.toLowerCase()}`}
          value={value}
          onInput={(e) => onChange(e.currentTarget.value)}
          className="size-[18px] shrink-0 cursor-pointer appearance-none overflow-hidden rounded border border-black/10 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 [&::-moz-color-swatch]:border-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0 [[data-theme=dark]_&]:border-white/15"
        />
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
  );
}
