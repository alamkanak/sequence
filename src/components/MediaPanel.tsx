import { useCallback, useMemo, useRef, useState } from "react";
import {
  UploadSimpleIcon,
  PlusIcon,
  FilmStripIcon,
  MusicNotesIcon,
  ImageIcon,
  TextTIcon,
  RectangleIcon,
  CircleIcon,
  MinusIcon,
  AtomIcon,
  MagnifyingGlassIcon,
  ArrowUpRightIcon,
  TrashIcon,
} from "./icons";
import { useStore, store } from "../core/store";
import {
  addAsset,
  addElement,
  importFiles,
  loadDemo,
  removeAsset,
} from "../core/actions";
import { createFileDropTarget } from "../core/file-drop";
import type { Asset } from "../core/model";
import { assetFiles } from "../engine/client";
import { cn, skin, Button, IconButton, Input, Modal } from "./ui";
import { ContextMenu } from "./ContextMenu";
export function MediaPanel({ widthClass = "w-60" }: { widthClass?: string }) {
  const { project, tab } = useStore();
  const drag = useRef<{
    id: string;
    x: number;
    y: number;
    active: boolean;
  } | null>(null);
  const picker = useRef<HTMLInputElement>(null),
    [loading, setLoading] = useState(false),
    [search, setSearch] = useState(""),
    [dropping, setDropping] = useState(false),
    [removing, setRemoving] = useState<Asset | null>(null);
  const [context, setContext] = useState<{
    asset: Asset;
    x: number;
    y: number;
    trigger: HTMLElement;
  } | null>(null);
  const importMedia = useCallback(async (files: File[]) => {
    store.patch({ tab: "media" });
    setLoading(true);
    try {
      await importFiles(files);
    } finally {
      setLoading(false);
    }
  }, []);
  const fileDrop = useMemo(
    () => createFileDropTarget(importMedia, setDropping),
    [importMedia],
  );
  const uses = project.clips.filter((c) => c.assetId === removing?.id);
  const lockedUse = uses.some(
    (c) => project.tracks.find((t) => t.id === c.trackId)?.locked,
  );
  function remove(id: string) {
    store.safe(() => {
      removeAsset(id);
      setRemoving(null);
    });
  }
  return (
    <aside
      aria-label="Media and elements"
      className={cn(
        "relative flex min-h-0 shrink-0 flex-col",
        widthClass,
        skin.border,
        skin.panel,
      )}
      {...fileDrop}
    >
      <div
        className={cn(
          "flex h-10 shrink-0 items-center gap-5 border-b px-4 text-xs",
          skin.border,
        )}
      >
        {(["media", "elements"] as const).map((t) => (
          <button
            key={t}
            onClick={() => store.patch({ tab: t })}
            className={cn(
              "h-full border-b-2 pt-0.5 capitalize",
              tab === t
                ? "border-indigo-400 text-indigo-400"
                : cn("border-transparent", skin.muted),
            )}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
        {tab === "media" ? (
          <>
            <input
              ref={picker}
              type="file"
              multiple
              accept="video/*,audio/*,image/*,.mkv,.mov,.m4a,.flac"
              className="hidden"
              aria-label="Import media files"
              onChange={(e) => {
                void importMedia(Array.from(e.target.files || []));
                e.target.value = "";
              }}
            />
            <Button
              onClick={() => picker.current?.click()}
              disabled={loading}
              className="w-full"
            >
              <UploadSimpleIcon size={15} />
              {loading ? "Reading media…" : "Import media"}
              <span className={cn("ml-auto text-xs", skin.muted)}>⌘I</span>
            </Button>
            <div className="relative mt-3">
              <MagnifyingGlassIcon
                size={13}
                className={cn(
                  "pointer-events-none absolute top-2.5 left-2",
                  skin.muted,
                )}
              />
              <Input
                aria-label="Search media"
                placeholder="Search your media…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border-0 bg-transparent pl-7"
              />
            </div>
            <div
              className={cn(
                "my-3 flex items-center justify-between text-xs",
                skin.muted,
              )}
            >
              <span>PROJECT MEDIA</span>
              <span>{project.assets.length} assets</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {project.assets
                .filter((a) =>
                  a.name.toLowerCase().includes(search.toLowerCase()),
                )
                .map((a) => (
                  <div
                    key={a.id}
                    role="group"
                    aria-label={`Media ${a.name}`}
                    tabIndex={0}
                    aria-haspopup="menu"
                    aria-expanded={context?.asset.id === a.id}
                    draggable={false}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setContext({
                        asset: a,
                        x: e.clientX,
                        y: e.clientY,
                        trigger: e.currentTarget,
                      });
                    }}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      if (
                        e.key === "ContextMenu" ||
                        (e.shiftKey && e.key === "F10")
                      ) {
                        e.preventDefault();
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setContext({
                          asset: a,
                          x: rect.left,
                          y: rect.bottom,
                          trigger: e.currentTarget,
                        });
                      }
                    }}
                    onPointerDown={(e) => {
                      if (
                        e.button !== 0 ||
                        e.ctrlKey ||
                        !assetFiles.has(a.id) ||
                        (e.target as HTMLElement).closest("button")
                      )
                        return;
                      drag.current = {
                        id: a.id,
                        x: e.clientX,
                        y: e.clientY,
                        active: false,
                      };
                      e.currentTarget.setPointerCapture(e.pointerId);
                    }}
                    onPointerMove={(e) => {
                      const d = drag.current;
                      if (!d) return;
                      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5)
                        d.active = true;
                      if (d.active)
                        window.dispatchEvent(
                          new CustomEvent("sequence-media-hover", {
                            detail: { id: d.id, x: e.clientX, y: e.clientY },
                          }),
                        );
                    }}
                    onPointerUp={(e) => {
                      const d = drag.current;
                      drag.current = null;
                      if (d?.active)
                        window.dispatchEvent(
                          new CustomEvent("sequence-media-drop", {
                            detail: { id: d.id, x: e.clientX, y: e.clientY },
                          }),
                        );
                    }}
                    onPointerCancel={() => {
                      drag.current = null;
                      window.dispatchEvent(
                        new CustomEvent("sequence-media-hover", {
                          detail: null,
                        }),
                      );
                    }}
                    onDoubleClick={() => store.safe(() => addAsset(a.id))}
                    className="group min-w-0 cursor-grab touch-none select-none"
                    data-testid={`asset-${a.kind}`}
                  >
                    <div
                      className={cn(
                        "relative flex aspect-video items-center justify-center overflow-hidden rounded-lg border",
                        skin.border,
                        skin.raised,
                      )}
                    >
                      {a.thumbnail ? (
                        <img
                          src={a.thumbnail}
                          draggable={false}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : a.kind === "audio" ? (
                        <MusicNotesIcon
                          size={24}
                          className="text-emerald-400"
                        />
                      ) : (
                        <FilmStripIcon size={24} className={skin.muted} />
                      )}
                      <span className="absolute right-1.5 bottom-1 rounded bg-black/55 px-1 font-mono text-xs text-white">
                        {a.duration.toFixed(1)}s
                      </span>
                      <IconButton
                        label={`Add ${a.name} to timeline`}
                        size="sm"
                        onClick={() => store.safe(() => addAsset(a.id))}
                        disabled={!assetFiles.has(a.id)}
                        className="absolute top-1 right-1 bg-black/50 text-white opacity-0 group-hover:opacity-100 focus:opacity-100"
                      >
                        <PlusIcon size={18} />
                      </IconButton>
                      {!assetFiles.has(a.id) && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/70 text-xs text-amber-300">
                          Import to relink
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5">
                      <p
                        className="min-w-0 flex-1 truncate text-xs"
                        title={a.name}
                      >
                        {a.name}
                      </p>
                    </div>
                    <p className={cn("mt-0.5 text-xs", skin.muted)}>
                      {a.hdr
                        ? "HDR · SDR preview"
                        : a.kind === "audio"
                          ? "Audio"
                          : `${a.width} × ${a.height}`}
                    </p>
                  </div>
                ))}
            </div>
            {!project.assets.length && (
              <div
                className={cn(
                  "mt-3 flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-5 text-center",
                  skin.border,
                )}
              >
                <UploadSimpleIcon
                  size={26}
                  weight="thin"
                  className={skin.muted}
                />
                <p className="text-xs">Your story starts here</p>
                <p className={cn("text-xs leading-relaxed", skin.muted)}>
                  Drop videos, audio, or images.
                  <br />
                  Everything stays on your device.
                </p>
                <Button variant="ghost" onClick={() => picker.current?.click()}>
                  Browse files <ArrowUpRightIcon size={12} />
                </Button>
              </div>
            )}
            <div className="mt-auto pt-6">
              <button
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border p-3 text-left text-xs",
                  skin.border,
                  skin.hover,
                )}
                onClick={async () => {
                  setLoading(true);
                  try {
                    await loadDemo();
                  } catch (e) {
                    store.patch({ error: String(e) });
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                <span>Explore with a sample project</span>
                <ArrowUpRightIcon size={12} />
              </button>
            </div>
          </>
        ) : (
          <>
            <p className={cn("mb-4 text-xs leading-relaxed", skin.muted)}>
              A few building blocks.
              <br />
              An endless number of stories.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  name: "Text",
                  Icon: TextTIcon,
                  action: () => addElement("text"),
                },
                {
                  name: "Rectangle",
                  Icon: RectangleIcon,
                  action: () => addElement("shape", "rectangle"),
                },
                {
                  name: "Ellipse",
                  Icon: CircleIcon,
                  action: () => addElement("shape", "ellipse"),
                },
                {
                  name: "Line",
                  Icon: MinusIcon,
                  action: () => addElement("shape", "line"),
                },
                {
                  name: "Animated orbit",
                  Icon: AtomIcon,
                  action: () => addElement("vector"),
                },
                {
                  name: "Image / GIF",
                  Icon: ImageIcon,
                  action: () => {
                    store.patch({ tab: "media" });
                    setTimeout(
                      () =>
                        document
                          .querySelector<HTMLInputElement>(
                            '[aria-label="Import media files"]',
                          )
                          ?.click(),
                      0,
                    );
                  },
                },
              ].map(({ name, Icon, action }) => (
                <button
                  key={name}
                  onClick={action}
                  className={cn(
                    "flex aspect-square flex-col items-center justify-center gap-3 rounded-lg border text-xs",
                    skin.border,
                    skin.raised,
                    skin.hover,
                  )}
                >
                  <Icon size={28} weight="light" className="text-indigo-400" />
                  {name}
                </button>
              ))}
            </div>
            <div
              className={cn(
                "mt-5 border-t pt-4 text-xs leading-relaxed",
                skin.border,
                skin.muted,
              )}
            >
              Add an element, then make it yours in the preview or Properties
              panel. Animated elements use the same timeline as your footage.
            </div>
          </>
        )}
      </div>
      {dropping && (
        <div
          role="status"
          className="pointer-events-none absolute inset-2 z-30 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-indigo-400 bg-indigo-50/95 p-5 text-center text-indigo-700 backdrop-blur-sm [[data-theme=dark]_&]:bg-[#17152a]/95 [[data-theme=dark]_&]:text-indigo-200"
        >
          <UploadSimpleIcon size={32} />
          <p className="text-sm font-medium">Drop to import media</p>
          <p className="text-xs leading-relaxed">
            Videos, audio, and images
            <br />
            Stay on your device
          </p>
        </div>
      )}
      {removing && (
        <Modal title="Remove media?" onClose={() => setRemoving(null)}>
          <p className="break-words text-sm font-medium">{removing.name}</p>
          <p className={cn("mt-3 text-xs leading-relaxed", skin.muted)}>
            This media is used by {uses.length} timeline{" "}
            {uses.length === 1 ? "segment" : "segments"}. Removing it also
            removes those segments. Your original file stays on disk. Undo
            restores the media and its segments.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button onClick={() => setRemoving(null)}>Cancel</Button>
            <Button
              variant="danger"
              disabled={lockedUse}
              onClick={() => remove(removing.id)}
            >
              <TrashIcon size={16} /> Remove media and segments
            </Button>
          </div>
          {lockedUse && (
            <p className="mt-3 text-xs text-amber-600 [[data-theme=dark]_&]:text-amber-300">
              Unlock tracks using this media before removing it.
            </p>
          )}
        </Modal>
      )}
      {context && (
        <ContextMenu
          label={`Actions for ${context.asset.name}`}
          x={context.x}
          y={context.y}
          trigger={context.trigger}
          onClose={() => setContext(null)}
          items={[
            {
              label: "Add to timeline",
              icon: <PlusIcon size={16} />,
              disabled: !assetFiles.has(context.asset.id),
              onSelect: () => store.safe(() => addAsset(context.asset.id)),
            },
            {
              label: "Remove media",
              icon: <TrashIcon size={16} />,
              danger: true,
              onSelect: () => {
                if (project.clips.some((c) => c.assetId === context.asset.id))
                  setRemoving(context.asset);
                else remove(context.asset.id);
              },
            },
          ]}
        />
      )}
    </aside>
  );
}
