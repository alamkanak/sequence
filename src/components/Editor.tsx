import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  StackSimpleIcon,
  CaretDownIcon,
  ArrowUpRightIcon,
  ArrowCounterClockwiseIcon,
  ArrowClockwiseIcon,
  ChartLineIcon,
  FloppyDiskIcon,
  FolderOpenIcon,
  PlusIcon,
  HouseIcon,
  XIcon,
  KeyboardIcon,
  SlidersHorizontalIcon,
} from "./icons";
import { store, useStore } from "../core/store";
import { emptyProject, validateProject } from "../core/model";
import { transport } from "../engine/transport";
import { download } from "../core/storage";
import {
  importFiles,
  duplicateClip,
  copySelectedClip,
  pasteTimelineClip,
  hasTimelineClipboard,
} from "../core/actions";
import { createFileDropTarget } from "../core/file-drop";
import { connectCompanion } from "../core/automation";
import { useExport } from "../engine/export";
import { Dropdown } from "./Dropdown";
import { MediaPanel } from "./MediaPanel";
import { Preview } from "./Preview";
import { Timeline } from "./Timeline";
import { PanelDivider, usePanelSize } from "./PanelDivider";
import { panelPixels, panelSizeClass } from "./panel-sizes";
import { Properties } from "./Properties";
import { Button, IconButton, ThemePicker, Modal, cn, skin } from "./ui";
const ExportDialog = lazy(() =>
  import("./ExportDialog").then((m) => ({ default: m.ExportDialog })),
);
const PerformanceDialog = lazy(() =>
  import("./PerformanceDialog").then((m) => ({ default: m.PerformanceDialog })),
);
export function Editor() {
  const { project, error } = useStore(),
    job = useExport();
  const [dialog, setDialog] = useState<
    "export" | "performance" | "shortcuts" | null
  >(null);
  const [approveCompanion, setApproveCompanion] = useState<(() => void) | null>(
    null,
  );
  const projectInput = useRef<HTMLInputElement>(null);
  const fileDrop = useMemo(() => createFileDropTarget(importFiles), []);
  const [left, setLeft] = usePanelSize("media", 240, 200, 600),
    [right, setRight] = usePanelSize("properties", 240, 200, 600),
    [timelineHeight, setTimelineHeight] = usePanelSize(
      "timeline",
      320,
      160,
      800,
    );
  const editorRef = useRef<HTMLDivElement>(null),
    mainRef = useRef<HTMLElement>(null);
  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: Math.max(640, window.innerHeight),
  });
  const leftMax = Math.max(200, Math.min(600, viewport.width - right - 322));
  const rightMax = Math.max(200, Math.min(600, viewport.width - left - 322));
  const timelineMax = Math.max(
    160,
    Math.min(800, viewport.height - 56 - (error ? 48 : 0) - 241),
  );
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      const next = {
        width: mainRef.current!.clientWidth,
        height: editorRef.current!.clientHeight,
      };
      setViewport((old) =>
        old.width === next.width && old.height === next.height ? old : next,
      );
    });
    observer.observe(editorRef.current!);
    observer.observe(mainRef.current!);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    setLeft((v) => panelPixels(v, 200, leftMax));
    setRight((v) => panelPixels(v, 200, rightMax));
    setTimelineHeight((v) => panelPixels(v, 160, timelineMax));
  }, [leftMax, rightMax, timelineMax, setLeft, setRight, setTimelineHeight]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (document.querySelector('[role="dialog"]')) return;
      if (
        (e.target as HTMLElement).matches(
          "input,textarea,select,[contenteditable]",
        )
      )
        return;
      const mod = e.metaKey || e.ctrlKey;
      const s = store.get(),
        c = s.project.clips.find((c) => c.id === s.selected);
      if (e.code === "Space") {
        e.preventDefault();
        void transport.play();
      }
      if (e.key.toLowerCase() === "s" && !mod && c)
        store.safe(() =>
          store.apply([{ op: "split", id: c.id, time: transport.time }]),
        );
      if ((e.key === "Delete" || e.key === "Backspace") && c) {
        e.preventDefault();
        store.safe(() => store.apply([{ op: "delete_clip", id: c.id }]));
        store.patch({ selected: null });
      }
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? store.redo() : store.undo();
      }
      if (mod && e.key.toLowerCase() === "c" && c) {
        e.preventDefault();
        copySelectedClip();
      }
      if (mod && e.key.toLowerCase() === "v" && hasTimelineClipboard()) {
        e.preventDefault();
        pasteTimelineClip();
      }
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateClip();
      }
      if (mod && e.key.toLowerCase() === "i") {
        e.preventDefault();
        document
          .querySelector<HTMLInputElement>('[aria-label="Import media files"]')
          ?.click();
      }
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        transport.seek(
          transport.time + (e.key === "ArrowRight" ? 1 : -1) / s.project.fps,
        );
      }
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        download(
          new Blob([JSON.stringify(s.project, null, 2)], {
            type: "application/json",
          }),
          `${s.project.name}.sequence.json`,
        );
      }
    };
    window.addEventListener("keydown", handler);
    const disconnect = connectCompanion((connect) =>
      setApproveCompanion(() => connect),
    );
    return () => {
      window.removeEventListener("keydown", handler);
      disconnect?.();
      transport.pause();
    };
  }, []);
  return (
    <div
      ref={editorRef}
      className={cn(
        "flex h-dvh min-h-[640px] min-w-[760px] flex-col overflow-hidden text-xs [&_a]:focus-visible:outline-2 [&_a]:focus-visible:outline-offset-2 [&_a]:focus-visible:outline-indigo-500 [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-offset-2 [&_button]:focus-visible:outline-indigo-500",
        skin.app,
      )}
      {...fileDrop}
      onCopy={(e) => {
        if (
          (e.target as HTMLElement).closest(
            "input,textarea,select,[contenteditable]",
          )
        )
          return;
        const { project, selected } = store.get();
        if (!project.clips.some((c) => c.id === selected)) return;
        copySelectedClip();
        e.clipboardData.setData("text/plain", "Sequence timeline segment");
        e.preventDefault();
      }}
      onPaste={(e) => {
        if (
          (e.target as HTMLElement).closest(
            "input,textarea,select,[contenteditable]",
          )
        )
          return;
        if (!hasTimelineClipboard()) return;
        e.preventDefault();
        pasteTimelineClip();
      }}
    >
      <header
        className={cn(
          "flex h-14 shrink-0 items-center justify-between gap-4 border-b px-4",
          skin.border,
          skin.panel,
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <a
            href="#/"
            aria-label="Sequence home"
            className="flex items-center gap-2 text-sm font-semibold tracking-tight"
          >
            <StackSimpleIcon
              size={22}
              weight="fill"
              className="text-indigo-600 [[data-theme=dark]_&]:text-indigo-400"
            />
            Sequence
          </a>
          <span className={cn("h-4 border-l", skin.border)} />
          <Dropdown
            label="Project menu"
            trigger={
              <>
                <span className="max-w-32 truncate lg:max-w-48">
                  {project.name}
                </span>
                <CaretDownIcon size={14} className={skin.muted} />
              </>
            }
          >
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                transport.pause();
                download(
                  new Blob([JSON.stringify(project, null, 2)], {
                    type: "application/json",
                  }),
                  `${project.name}.sequence.json`,
                );
              }}
            >
              <FloppyDiskIcon size={16} />
              Save project JSON
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => projectInput.current?.click()}
            >
              <FolderOpenIcon size={16} />
              Open project JSON
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                transport.pause();
                store.replace(emptyProject());
                store.patch({ selected: null });
                transport.seek(0);
              }}
            >
              <PlusIcon size={16} />
              New project
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                store.patch({ selected: null });
              }}
            >
              <SlidersHorizontalIcon size={16} />
              Project settings
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => (location.hash = "/")}
            >
              <HouseIcon size={16} />
              Back to home
            </Button>
          </Dropdown>
          <span
            className={cn(
              "hidden shrink-0 items-center gap-1 text-xs xl:flex",
              skin.muted,
            )}
          >
            <span className="size-1 rounded-full bg-emerald-400" />
            Local workspace
          </span>
        </div>
        <div className={cn("flex shrink-0 items-center gap-1", skin.muted)}>
          <IconButton
            label="Undo"
            onClick={() => store.undo()}
            disabled={!store.canUndo()}
          >
            <ArrowCounterClockwiseIcon size={18} />
          </IconButton>
          <IconButton
            label="Redo"
            onClick={() => store.redo()}
            disabled={!store.canRedo()}
          >
            <ArrowClockwiseIcon size={18} />
          </IconButton>
          <span className={cn("mx-2 h-4 border-l", skin.border)} />
          <IconButton
            label="Keyboard shortcuts"
            onClick={() => setDialog("shortcuts")}
          >
            <KeyboardIcon size={18} />
          </IconButton>
          <IconButton
            label="Performance lab"
            onClick={() => setDialog("performance")}
          >
            <ChartLineIcon size={18} />
          </IconButton>
          <ThemePicker compact />
          <Button
            variant="primary"
            className="ml-2 h-9 px-4"
            onClick={() => setDialog("export")}
          >
            {job.status === "rendering"
              ? `Rendering ${Math.round(job.progress * 100)}%`
              : "Export"}
            <ArrowUpRightIcon size={16} />
          </Button>
        </div>
      </header>
      <input
        ref={projectInput}
        type="file"
        accept=".json"
        aria-label="Open project file"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            transport.pause();
            const p = validateProject(JSON.parse(await file.text()));
            store.replace(p);
            store.patch({ selected: null });
            transport.seek(0);
          } catch (err) {
            store.patch({
              error: `Invalid project: ${err instanceof Error ? err.message : err}`,
            });
          }
          e.target.value = "";
        }}
      />
      {error && (
        <div
          role="alert"
          className="flex shrink-0 items-center justify-between gap-4 border-b border-amber-500/15 bg-amber-500/5 px-4 py-2 text-xs text-amber-600 [[data-theme=dark]_&]:text-amber-300"
        >
          <span>{error}</span>
          <IconButton
            label="Dismiss notification"
            size="xs"
            onClick={() => store.patch({ error: "" })}
          >
            <XIcon size={16} />
          </IconButton>
        </div>
      )}
      <main ref={mainRef} className="flex min-h-60 flex-1">
        <MediaPanel widthClass={panelSizeClass(left)} />
        <PanelDivider
          label="Resize media panel"
          value={left}
          min={200}
          max={leftMax}
          initial={240}
          onChange={setLeft}
        />
        <Preview />
        <PanelDivider
          label="Resize properties panel"
          value={right}
          min={200}
          max={rightMax}
          initial={240}
          invert
          onChange={setRight}
        />
        <Properties widthClass={panelSizeClass(right)} />
      </main>
      <PanelDivider
        label="Resize timeline panel"
        orientation="horizontal"
        value={timelineHeight}
        min={160}
        max={timelineMax}
        initial={320}
        invert
        onChange={setTimelineHeight}
      />
      <Timeline heightClass={panelSizeClass(timelineHeight)} />
      <Suspense fallback={null}>
        {dialog === "export" && (
          <ExportDialog onClose={() => setDialog(null)} />
        )}{" "}
        {dialog === "performance" && (
          <PerformanceDialog onClose={() => setDialog(null)} />
        )}
      </Suspense>
      {approveCompanion && (
        <Modal
          title="Connect AI agent"
          onClose={() => setApproveCompanion(null)}
        >
          <div className="space-y-4 text-sm">
            <p>Allow your AI agent to control “{project.name}”?</p>
            <p className={skin.muted}>
              Your agent can inspect and edit this project, request preview
              images, and start exports. Project data and requested previews are
              shared with your AI client. Rendering stays in your browser.
            </p>
            <p className={skin.muted}>
              Keep this tab open. Allow local network access if your browser
              asks.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setApproveCompanion(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  approveCompanion();
                  setApproveCompanion(null);
                }}
              >
                Connect
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {dialog === "shortcuts" && (
        <Modal
          title="A little faster, with keys"
          onClose={() => setDialog(null)}
        >
          <div className="space-y-3 text-xs">
            {[
              ["Space", "Play / pause"],
              ["S", "Split selected segment"],
              ["Delete", "Delete selected segment"],
              ["⌘ / Ctrl + Z", "Undo"],
              ["⌘ / Ctrl + Shift + Z", "Redo"],
              ["⌘ / Ctrl + D", "Duplicate"],
              ["⌘ / Ctrl + C", "Copy selected segment"],
              ["⌘ / Ctrl + V", "Paste at playhead"],
              ["Corner / side drag", "Proportional / one-axis resize"],
              ["Shift + corner drag", "Free aspect ratio"],
              ["⌘ / Ctrl + I", "Import media"],
              ["⌘ / Ctrl + S", "Save project JSON"],
              ["← / →", "Step one frame"],
              ["Option / Alt + resize", "Resize from the center"],
              ["⌘ / Ctrl + resize", "Bypass preview resize snapping"],
              ["Alt + move / timeline drag", "Bypass snapping"],
              ["R", "Select an audio range"],
              ["Option / Alt + click volume line", "Add a volume point"],
              ["Shift + scroll", "Pan the timeline"],
            ].map(([key, label]) => (
              <div
                key={key}
                className={cn(
                  "flex justify-between border-b pb-2",
                  skin.border,
                )}
              >
                <span>{label}</span>
                <kbd className={skin.muted}>{key}</kbd>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
