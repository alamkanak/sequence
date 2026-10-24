import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon } from "../components/icons";
import { cn, skin } from "../components/ui";

export function Code({
  value,
  label = "JSON",
}: {
  value: string;
  label?: string;
}) {
  const [status, setStatus] = useState("Copy");
  useEffect(() => {
    setStatus("Copy");
  }, [value]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("Copied");
    } catch {
      setStatus("Select the code to copy");
    }
  }
  return (
    <div
      className={cn(
        "my-5 min-w-0 overflow-hidden rounded-xl border",
        skin.border,
        skin.panel,
      )}
    >
      <div
        className={cn(
          "flex min-h-11 items-center justify-between gap-2 border-b px-4 text-xs",
          skin.border,
          skin.muted,
        )}
      >
        <span className="min-w-0 font-mono break-all">{label}</span>
        <button
          type="button"
          onClick={() => void copy()}
          aria-label={`Copy ${label}`}
          className="flex min-h-9 shrink-0 items-center gap-2 rounded px-2 hover:text-indigo-500"
        >
          {status === "Copied" ? (
            <CheckIcon size={14} />
          ) : (
            <CopyIcon size={14} />
          )}
          <span aria-live="polite">{status}</span>
        </button>
      </div>
      <pre
        tabIndex={0}
        className="max-h-[34rem] overflow-auto p-5 text-xs leading-7 text-zinc-700 sm:text-sm [[data-theme=dark]_&]:text-zinc-300"
      >
        <code>{value}</code>
      </pre>
    </div>
  );
}
