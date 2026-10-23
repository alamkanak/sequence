import { useEffect, useRef, useState } from "react";
import { Field, Input } from "./ui";
export function NumberField({
  label,
  ariaLabel,
  value,
  onChange,
  min,
  max,
  step = 0.1,
}: {
  label: string;
  ariaLabel?: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const edited = useRef(false);
  const [draft, setDraft] = useState(String(Math.round(value * 1000) / 1000));
  useEffect(() => {
    setDraft(String(Math.round(value * 1000) / 1000));
    edited.current = false;
  }, [value]);
  const commit = () => {
    if (!edited.current) return;
    edited.current = false;
    let n = Number(draft);
    if (!Number.isFinite(n) || draft.trim() === "") {
      setDraft(String(value));
      return;
    }
    n = Math.max(min ?? -Infinity, Math.min(max ?? Infinity, n));
    setDraft(String(Math.round(n * 1000) / 1000));
    if (n !== value) onChange(n);
  };
  return (
    <Field label={label}>
      <Input
        aria-label={ariaLabel || label}
        type="number"
        value={draft}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          edited.current = true;
          setDraft(e.target.value);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            edited.current = false;
            setDraft(String(Math.round(value * 1000) / 1000));
            e.currentTarget.blur();
            e.preventDefault();
          }
        }}
      />
    </Field>
  );
}
