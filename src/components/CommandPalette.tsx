import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Input, Modal, cn, skin } from "./ui";
import { MagnifyingGlassIcon, ArrowRightIcon } from "./icons";

export interface EditorCommand {
  id: string;
  label: string;
  group: string;
  keywords?: string;
  shortcut?: string;
  disabled?: string;
  run: () => void;
}

// Include the actual controls, so contextual features (track actions, audio
// automation, paint, export settings) remain discoverable as the UI evolves.
function controlCommands(root: HTMLElement): EditorCommand[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'button, input:not([type="file"]), textarea, [role="combobox"], [role="separator"][tabindex="0"], summary',
    ),
  ).flatMap((node, index) => {
    if (!node.checkVisibility() || node.closest("[data-command-palette]"))
      return [];
    const label =
      node.getAttribute("aria-label") ||
      (node instanceof HTMLInputElement
        ? node.labels?.[0]?.textContent?.trim()
        : "") ||
      node.textContent?.trim();
    if (!label || label === "Commands" || label === "Close dialog") return [];
    const edit = node.matches(
      "input,textarea,[role=combobox],[role=separator]",
    );
    const region = node.closest("aside,section,[role=dialog],header");
    const group =
      (node.closest("[data-track-controls]")
        ? "Tracks"
        : region?.getAttribute("aria-label")) ||
      region?.querySelector("h3")?.textContent ||
      "Editor";
    const pressed = node.getAttribute("aria-pressed");
    return [
      {
        id: `control-${index}`,
        label: `${edit ? "Edit " : ""}${label}`,
        group,
        keywords:
          pressed === null ? "" : `toggle ${pressed === "true" ? "on" : "off"}`,
        disabled: node.matches(":disabled,[aria-disabled=true]")
          ? "Unavailable in the current selection"
          : undefined,
        run: () => {
          node.scrollIntoView({ block: "nearest", inline: "nearest" });
          node.focus();
          if (node.getAttribute("role") === "combobox")
            node.dispatchEvent(
              new KeyboardEvent("keydown", {
                key: "ArrowDown",
                bubbles: true,
                cancelable: true,
              }),
            );
          else if (!edit) node.click();
          else if (node instanceof HTMLInputElement && node.type !== "range")
            node.select();
        },
      },
    ];
  });
}

export function CommandPalette({
  root,
  commands,
  onClose,
}: {
  root: HTMLElement;
  commands: EditorCommand[];
  onClose: () => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const controls = useMemo(() => controlCommands(root), [root]);
  const all = [
    ...commands,
    ...controls.filter(
      (control) =>
        !commands.some(
          (command) =>
            command.label.toLowerCase() === control.label.toLowerCase(),
        ),
    ),
  ];
  const words = query.toLowerCase().trim().split(/\s+/);
  const matches = all.filter((command) =>
    words.every((word) =>
      `${command.label} ${command.group} ${command.keywords || ""}`
        .toLowerCase()
        .includes(word),
    ),
  );
  const current = Math.min(active, Math.max(0, matches.length - 1));
  useEffect(() => {
    input.current?.focus();
  }, []);
  useEffect(() => {
    document
      .getElementById(`${id}-${current}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [id, current, query]);
  function execute(command: EditorCommand) {
    if (command.disabled) return;
    onClose();
    // Restore modal focus first, then focus/open the requested feature.
    requestAnimationFrame(command.run);
  }
  return (
    <Modal title="Commands" onClose={onClose}>
      <div data-command-palette className="space-y-3">
        <div className="relative">
          <MagnifyingGlassIcon
            size={18}
            className={cn(
              "pointer-events-none absolute top-2.5 left-3",
              skin.muted,
            )}
          />
          <Input
            ref={input}
            role="combobox"
            aria-label="Search commands"
            aria-expanded="true"
            aria-autocomplete="list"
            aria-controls={`${id}-results`}
            aria-activedescendant={
              matches.length ? `${id}-${current}` : undefined
            }
            placeholder="Search actions, settings, media…"
            className="h-10 pl-10 text-sm"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                setActive(
                  matches.length
                    ? (current +
                        (event.key === "ArrowDown" ? 1 : -1) +
                        matches.length) %
                        matches.length
                    : 0,
                );
              }
              if (event.key === "Enter") {
                event.preventDefault();
                if (matches[current]) execute(matches[current]);
              }
            }}
          />
        </div>
        <div
          id={`${id}-results`}
          role="listbox"
          aria-label="Available commands"
          className="max-h-[50dvh] overflow-y-auto"
        >
          {matches.map((command, index) => (
            <div
              key={command.id}
              id={`${id}-${index}`}
              role="option"
              aria-selected={index === current}
              aria-disabled={!!command.disabled}
              onPointerMove={() => setActive(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => execute(command)}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-xs",
                index === current &&
                  "bg-indigo-500/10 text-indigo-700 [[data-theme=dark]_&]:text-indigo-200",
                command.disabled && "cursor-not-allowed opacity-45",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{command.label}</p>
                <p className={cn("mt-1", skin.muted)}>
                  {command.disabled || command.group}
                </p>
              </div>
              {command.shortcut ? (
                <kbd className={cn("shrink-0", skin.muted)}>
                  {command.shortcut}
                </kbd>
              ) : (
                <ArrowRightIcon size={14} className={skin.muted} />
              )}
            </div>
          ))}
          {!matches.length && (
            <p className={cn("px-3 py-8 text-center text-xs", skin.muted)}>
              No commands found. Try “import”, “track”, or “color”.
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex items-center justify-between border-t pt-3 text-xs",
            skin.border,
            skin.muted,
          )}
        >
          <span aria-live="polite">{matches.length} commands</span>
          <span>↑ ↓ Navigate · Enter Run · Esc Close</span>
        </div>
      </div>
    </Modal>
  );
}
