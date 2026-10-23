import { cn } from "./ui";

// One type scale and two action styles across the entire landing page.
export const landing = {
  eyebrow:
    "text-sm font-semibold text-indigo-600 [[data-theme=dark]_&]:text-indigo-300",
  heading:
    "text-3xl leading-tight font-semibold tracking-tight text-balance md:text-4xl",
  title: "text-xl leading-snug font-semibold tracking-tight",
  body: "text-base leading-relaxed text-zinc-600 [[data-theme=dark]_&]:text-zinc-400",
  note: "text-sm leading-relaxed text-zinc-600 [[data-theme=dark]_&]:text-zinc-400",
  section: "scroll-mt-8 py-16 md:py-24",
};

export function landingAction(variant: "primary" | "secondary" = "primary") {
  return cn(
    "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border px-5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-500 disabled:cursor-wait disabled:opacity-60 [&_svg]:shrink-0",
    variant === "primary"
      ? "border-indigo-600 bg-indigo-600 text-white hover:border-indigo-700 hover:bg-indigo-700"
      : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-400 hover:bg-zinc-50 [[data-theme=dark]_&]:border-white/15 [[data-theme=dark]_&]:bg-white/5 [[data-theme=dark]_&]:text-zinc-100 [[data-theme=dark]_&]:hover:border-white/30 [[data-theme=dark]_&]:hover:bg-white/10",
  );
}
