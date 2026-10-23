import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  useEffect,
  useState,
  useRef,
} from "react";
import { XIcon, SunIcon, MoonIcon, MonitorIcon } from "./icons";
export const cn = (...values: (string | false | undefined | null)[]) =>
  values.filter(Boolean).join(" ");
export const skin = {
  app: "bg-[#fafafa] text-zinc-900 [[data-theme=dark]_&]:bg-[#0b0b0e] [[data-theme=dark]_&]:text-zinc-100",
  panel: "bg-white [[data-theme=dark]_&]:bg-[#111114]",
  raised: "bg-zinc-50 [[data-theme=dark]_&]:bg-[#18181d]",
  border: "border-zinc-200 [[data-theme=dark]_&]:border-white/[0.08]",
  muted: "text-zinc-500 [[data-theme=dark]_&]:text-zinc-400",
  input:
    "border border-zinc-200 bg-zinc-50 text-zinc-900 [[data-theme=dark]_&]:border-white/10 [[data-theme=dark]_&]:bg-[#1a1a20] [[data-theme=dark]_&]:text-zinc-100",
  hover: "hover:bg-zinc-100 [[data-theme=dark]_&]:hover:bg-white/[0.06]",
};
export const controlClass = cn(
  "h-8 rounded-md text-xs outline-none transition-colors hover:border-zinc-300 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-40 [[data-theme=dark]_&]:hover:border-white/20 [[data-theme=dark]_&]:focus:border-indigo-400/60",
  skin.input,
);
export function Button({
  children,
  className,
  variant = "secondary",
  iconOnly = false,
  textSize = "xs",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  iconOnly?: boolean;
  textSize?: "xs" | "sm";
}) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:shrink-0",
        textSize === "sm" ? "text-sm" : "text-xs",
        iconOnly ? "p-0" : "px-3 py-2",
        variant === "primary"
          ? "bg-indigo-500 text-white hover:bg-indigo-400"
          : variant === "danger"
            ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
            : variant === "ghost"
              ? skin.hover
              : cn("border", skin.border, skin.panel, skin.hover),
        className,
      )}
    >
      {children}
    </button>
  );
}
export function IconButton({
  label,
  children,
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <Button
      aria-label={label}
      title={label}
      variant="ghost"
      iconOnly
      {...props}
      className={cn(
        size === "lg" ? "size-10" : size === "sm" ? "size-8" : "size-9",
        props.className,
      )}
    >
      {children}
    </Button>
  );
}
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        controlClass,
        "w-full min-w-0 px-2.5",
        props.type === "number" &&
          "tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none",
        props.className,
      )}
    />
  );
}
export function Field({
  label,
  children,
  htmlFor,
}: {
  label: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  if (htmlFor) {
    return (
      <div className="flex min-w-0 flex-col gap-1.5">
        <label htmlFor={htmlFor} className={cn("text-xs", skin.muted)}>
          {label}
        </label>
        {children}
      </div>
    );
  }
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className={cn("text-xs", skin.muted)}>{label}</span>
      {children}
    </label>
  );
}
export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("space-y-3 border-b px-4 py-4", skin.border)}>
      <h3 className="text-xs font-medium">{title}</h3>
      {children}
    </section>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement>(null),
    closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const old = document.activeElement as HTMLElement;
    const focusable = () =>
      Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
        ) || [],
      ).filter((el) => el.getClientRects().length > 0);
    focusable()[0]?.focus();
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
      if (event.key === "Tab") {
        const nodes = focusable(),
          first = nodes[0],
          last = nodes.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", listener);
    return () => {
      window.removeEventListener("keydown", listener);
      old?.focus();
    };
  }, []);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-6 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-2xl border shadow-2xl",
          wide ? "max-w-3xl" : "max-w-lg",
          skin.app,
          skin.border,
        )}
      >
        <header
          className={cn(
            "flex items-center justify-between border-b px-5 py-4",
            skin.border,
          )}
        >
          <h2 className="text-sm font-semibold">{title}</h2>
          <IconButton label="Close dialog" onClick={onClose}>
            <XIcon size={20} />
          </IconButton>
        </header>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
export type Theme = "system" | "light" | "dark";
export function ThemePicker({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return (localStorage.getItem("sequence-theme") as Theme) || "system";
    } catch {
      return "system";
    }
  });
  useEffect(() => {
    const m = matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      (document.documentElement.dataset.theme =
        theme === "system" ? (m.matches ? "dark" : "light") : theme);
    apply();
    localStorage.setItem("sequence-theme", theme);
    if (theme === "system") m.addEventListener("change", apply);
    return () => m.removeEventListener("change", apply);
  }, [theme]);
  return (
    <div
      role="group"
      aria-label="Appearance"
      className={cn(
        "flex items-center gap-0.5 rounded-lg border p-0.5",
        skin.border,
        className,
      )}
    >
      {(
        [
          { value: "system", Icon: MonitorIcon },
          { value: "light", Icon: SunIcon },
          { value: "dark", Icon: MoonIcon },
        ] as const
      ).map(({ value, Icon }) => (
        <IconButton
          key={value}
          label={`${value[0].toUpperCase() + value.slice(1)} appearance`}
          aria-pressed={theme === value}
          onClick={() => setTheme(value)}
          className={cn(
            "rounded-md",
            theme === value &&
              "bg-indigo-500/10 text-indigo-600 [[data-theme=dark]_&]:bg-indigo-500/15 [[data-theme=dark]_&]:text-indigo-300",
          )}
        >
          <Icon size={18} />
        </IconButton>
      ))}
    </div>
  );
}
export const timecode = (s: number, fps = 30) => {
  const f = Math.max(0, Math.round(s * fps));
  return `${String(Math.floor(f / fps / 60)).padStart(2, "0")}:${String(Math.floor(f / fps) % 60).padStart(2, "0")}:${String(Math.floor(f % fps)).padStart(2, "0")}`;
};
