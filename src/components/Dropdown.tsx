import { useEffect, useRef, type ReactNode } from "react";
import { cn, skin } from "./ui";

export function Dropdown({
  label,
  trigger,
  children,
}: {
  label: string;
  trigger: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node))
        ref.current?.removeAttribute("open");
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !ref.current?.open) return;
      ref.current.open = false;
      ref.current.querySelector("summary")?.focus();
      e.preventDefault();
    };
    window.addEventListener("pointerdown", outside, true);
    window.addEventListener("keydown", escape, true);
    return () => {
      window.removeEventListener("pointerdown", outside, true);
      window.removeEventListener("keydown", escape, true);
    };
  }, []);
  return (
    <details
      ref={ref}
      className="relative min-w-0"
      onKeyDown={(e) => e.stopPropagation()}
    >
      <summary
        aria-label={label}
        className="flex cursor-pointer list-none items-center gap-2 text-sm"
      >
        {trigger}
      </summary>
      <div
        className={cn(
          "absolute top-8 left-0 z-40 w-60 rounded-lg border p-1.5 shadow-xl",
          skin.panel,
          skin.border,
        )}
        onClickCapture={(e) => {
          if ((e.target as Element).closest("button,a"))
            ref.current!.open = false;
        }}
      >
        {children}
      </div>
    </details>
  );
}
