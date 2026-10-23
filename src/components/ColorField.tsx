import { useEffect, useState } from "react";
import { Field, cn, skin } from "./ui";
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
  const [hex, setHex] = useState(value.slice(1));
  useEffect(() => setHex(value.slice(1)), [value]);
  const commit = () => {
    const next = hex.replace(/^#/, "");
    if (/^[\da-f]{6}$/i.test(next)) {
      if (`#${next.toLowerCase()}` !== value.toLowerCase())
        onChange(`#${next.toLowerCase()}`);
    } else setHex(value.slice(1));
  };
  return (
    <Field label={label}>
      <div className="flex min-w-0 items-center gap-1">
        <input
          type="color"
          aria-label={ariaLabel}
          value={value}
          onInput={(e) => onChange(e.currentTarget.value)}
          className={cn("h-8 w-6 shrink-0 rounded-md border p-0.5", skin.input)}
        />
        <input
          aria-label={`${ariaLabel} hex`}
          value={hex}
          maxLength={7}
          spellCheck={false}
          onChange={(e) => setHex(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className={cn(
            "h-8 w-full min-w-0 rounded-md border px-1 font-mono text-xs outline-none focus:border-indigo-400",
            skin.input,
          )}
        />
      </div>
    </Field>
  );
}
