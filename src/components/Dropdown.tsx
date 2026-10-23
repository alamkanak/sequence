import { useEffect, useRef, type ReactNode } from "react";
import { cn, skin } from "./ui";
import { editor } from "./editor-ui";

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
        className={cn(
          "-mx-2 flex h-8 cursor-pointer list-none items-center gap-2 rounded-md px-2 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 [&::-webkit-details-marker]:hidden",
          skin.hover,
        )}
      >
        {trigger}
      </summary>
      <div
        className={cn("absolute top-10 left-0 z-40 w-60", editor.menu)}
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
