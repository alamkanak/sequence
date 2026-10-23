import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button, cn, skin } from "./ui";
import { menuPosition } from "./menu-position";
export interface ContextMenuItem {
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  danger?: boolean;
  onSelect: () => void;
}
export function ContextMenu({
  label,
  x,
  y,
  trigger,
  items,
  onClose,
}: {
  label: string;
  x: number;
  y: number;
  trigger: HTMLElement;
  items: ContextMenuItem[];
  onClose: () => void;
}) {
  const menu = useRef<HTMLDivElement>(null),
    close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    menu.current?.querySelector<HTMLElement>("button:not(:disabled)")?.focus();
    const dismiss = () => close.current();
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);
    return () => {
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("scroll", dismiss, true);
      trigger.focus({ preventScroll: true });
    };
  }, [trigger]);
  return createPortal(
    <div
      className="fixed inset-0 z-50 grid grid-cols-100 grid-rows-100 font-sans text-xs antialiased"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape" || e.key === "Tab") {
          e.preventDefault();
          onClose();
          return;
        }
        if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) return;
        e.preventDefault();
        const nodes = [
          ...menu.current!.querySelectorAll<HTMLButtonElement>(
            "button:not(:disabled)",
          ),
        ];
        const current = nodes.indexOf(
          document.activeElement as HTMLButtonElement,
        );
        const index =
          e.key === "Home"
            ? 0
            : e.key === "End"
              ? nodes.length - 1
              : (current + (e.key === "ArrowDown" ? 1 : -1) + nodes.length) %
                nodes.length;
        nodes[index]?.focus();
      }}
    >
      <div
        ref={menu}
        role="menu"
        aria-label={label}
        className={cn(
          "w-52 self-start justify-self-start rounded-lg border p-1 shadow-2xl text-zinc-900 [[data-theme=dark]_&]:text-zinc-100",
          skin.panel,
          skin.border,
          menuPosition(x, y, window.innerWidth, window.innerHeight),
        )}
      >
        {items.map((item) => (
          <Button
            key={item.label}
            role="menuitem"
            tabIndex={-1}
            variant="ghost"
            disabled={item.disabled}
            className={cn(
              "w-full justify-start focus-visible:bg-indigo-500/10",
              item.danger && "text-red-600 [[data-theme=dark]_&]:text-red-400",
            )}
            onClick={() => {
              onClose();
              item.onSelect();
            }}
          >
            {item.icon}
            {item.label}
          </Button>
        ))}
      </div>
    </div>,
    document.body,
  );
}
