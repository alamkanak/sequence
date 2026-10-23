import { useId } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { CaretDownIcon, CaretUpIcon, CheckIcon } from "./icons";
import { Field, cn, controlClass, skin } from "./ui";

export function Select({
  label,
  value,
  onChange,
  options,
  disabled = false,
  hideLabel = false,
  className,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  options: { value: string | number; label: string }[];
  disabled?: boolean;
  hideLabel?: boolean;
  className?: string;
}) {
  const id = useId();
  const select = (
    <SelectPrimitive.Root
      value={String(value)}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-label={label}
        className={cn(
          controlClass,
          "flex min-w-0 items-center justify-between gap-2 px-2.5 text-left data-[state=open]:border-indigo-500/60 data-[state=open]:ring-2 data-[state=open]:ring-indigo-500/10",
          !hideLabel && "w-full",
          className,
        )}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <span className="min-w-0 flex-1 truncate">
          <SelectPrimitive.Value />
        </span>
        <SelectPrimitive.Icon asChild>
          <CaretDownIcon size={14} className={cn("shrink-0", skin.muted)} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={5}
          collisionPadding={8}
          aria-label={label}
          onKeyDown={(event) => event.stopPropagation()}
          onEscapeKeyDown={(event) => event.stopPropagation()}
          className="z-[60] max-h-[min(20rem,var(--radix-select-content-available-height))] min-w-[max(8rem,var(--radix-select-trigger-width))] overflow-hidden rounded-lg border border-zinc-200 bg-white font-sans text-xs text-zinc-800 shadow-xl shadow-black/10 [[data-theme=dark]_&]:border-white/10 [[data-theme=dark]_&]:bg-[#202024] [[data-theme=dark]_&]:text-zinc-200 [[data-theme=dark]_&]:shadow-black/40"
        >
          <SelectPrimitive.ScrollUpButton className="flex h-6 items-center justify-center text-zinc-500">
            <CaretUpIcon size={14} />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={String(option.value)}
                className="relative flex min-h-8 cursor-default items-center rounded px-2 pr-8 outline-none select-none data-[highlighted]:bg-zinc-100 data-[highlighted]:text-zinc-950 [[data-theme=dark]_&]:data-[highlighted]:bg-white/[0.08] [[data-theme=dark]_&]:data-[highlighted]:text-white"
              >
                <SelectPrimitive.ItemText>
                  {option.label}
                </SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-2 flex items-center text-indigo-600 [[data-theme=dark]_&]:text-indigo-300">
                  <CheckIcon size={14} weight="bold" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="flex h-6 items-center justify-center text-zinc-500">
            <CaretDownIcon size={14} />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
  return hideLabel ? (
    select
  ) : (
    <Field label={label} htmlFor={id}>
      {select}
    </Field>
  );
}
