import {
  addAsset,
  addElement,
  loadDemo,
  copySelectedClip,
  hasTimelineClipboard,
  pasteTimelineClip,
} from "../core/actions";
import { duration, emptyProject } from "../core/model";
import { store } from "../core/store";
import { download } from "../core/storage";
import { assetFiles } from "../engine/client";
import { transport } from "../engine/transport";
import type { EditorCommand } from "./CommandPalette";

export type EditorDialog =
  "export" | "performance" | "shortcuts" | "import" | null;

export function saveProjectFile() {
  const project = store.get().project;
  download(
    new Blob([JSON.stringify(project, null, 2)], { type: "application/json" }),
    `${project.name}.sequence.json`,
  );
}

export function editorCommands(
  openDialog: (dialog: EditorDialog) => void,
  openProject: () => void,
  pasteMediaFromClipboard: () => void,
): EditorCommand[] {
  const { project, selected } = store.get();
  const clip = project.clips.find((clip) => clip.id === selected);
  const commands: EditorCommand[] = [];
  const add = (
    id: string,
    label: string,
    group: string,
    run: () => void,
    options: Partial<EditorCommand> = {},
  ) => commands.push({ id, label, group, run, ...options });
  add("import", "Import media", "Media", () => openDialog("import"), {
    shortcut: "⌘ / Ctrl I",
    keywords: "upload browse files clipboard paste image gif",
  });
  add(
    "clipboard-media",
    "Paste media from clipboard",
    "Media",
    pasteMediaFromClipboard,
    { keywords: "import image screenshot video audio" },
  );
  add("sample", "Open sample project", "Project", () => {
    void loadDemo().catch((error) => store.patch({ error: String(error) }));
  });
  add("image", "Add image / GIF", "Elements", () => openDialog("import"));
  add("save", "Save project JSON", "Project", saveProjectFile, {
    shortcut: "⌘ / Ctrl S",
  });
  add("open", "Open project JSON", "Project", openProject);
  add("new", "New project", "Project", () => {
    transport.pause();
    store.replace(emptyProject());
    store.patch({ selected: null });
    transport.seek(0);
  });
  add(
    "settings",
    "Project settings",
    "Project",
    () => {
      store.patch({ selected: null });
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLInputElement>('[aria-label="Project name"]')
          ?.focus(),
      );
    },
    {
      keywords:
        "name width height resolution aspect ratio frame rate fps canvas background color",
    },
  );
  add("home", "Back to home", "Project", () => {
    location.hash = "/";
  });
  for (const [dialog, label] of [
    ["export", "Export"],
    ["performance", "Performance lab"],
    ["shortcuts", "Keyboard shortcuts"],
  ] as const)
    add(dialog, label, "Workspace", () => openDialog(dialog));
  add("media", "Show media", "Navigation", () => store.patch({ tab: "media" }));
  add("elements", "Show elements", "Navigation", () =>
    store.patch({ tab: "elements" }),
  );
  for (const [label, kind, shape] of [
    ["Text", "text"],
    ["Rectangle", "shape", "rectangle"],
    ["Ellipse", "shape", "ellipse"],
    ["Line", "shape", "line"],
    ["Animated orbit", "vector"],
  ] as const)
    add(
      `add-${label}`,
      `Add ${label.toLowerCase()}`,
      "Elements",
      () => addElement(kind, shape),
      {
        disabled: project.tracks.some(
          (track) => track.type === "visual" && !track.locked,
        )
          ? undefined
          : "Unlock or add a video track first",
      },
    );
  add(
    "copy",
    "Copy selected segment",
    "Edit",
    () => {
      copySelectedClip();
      void navigator.clipboard
        ?.writeText("Sequence timeline segment")
        .catch(() => {
          store.patch({
            error:
              "Clipboard access is unavailable. Use Paste segment at playhead in Commands to paste your segment.",
          });
        });
    },
    {
      shortcut: "⌘ / Ctrl C",
      disabled: clip ? undefined : "Select a segment first",
    },
  );
  add("paste", "Paste segment at playhead", "Edit", pasteTimelineClip, {
    shortcut: "⌘ / Ctrl V",
    disabled: hasTimelineClipboard() ? undefined : "Copy a segment first",
  });
  add(
    "play",
    "Play / pause",
    "Playback",
    () => {
      void transport.play();
    },
    { shortcut: "Space" },
  );
  add("start", "Go to start", "Playback", () => transport.seek(0));
  add("end", "Go to end", "Playback", () => transport.seek(duration(project)));
  add(
    "previous-frame",
    "Previous frame",
    "Playback",
    () => transport.seek(transport.time - 1 / project.fps),
    { shortcut: "←" },
  );
  add(
    "next-frame",
    "Next frame",
    "Playback",
    () => transport.seek(transport.time + 1 / project.fps),
    { shortcut: "→" },
  );
  if (clip) {
    add("segment-start", "Go to selected segment start", "Playback", () =>
      transport.seek(clip.start),
    );
    add("segment-end", "Go to selected segment end", "Playback", () =>
      transport.seek(clip.start + clip.duration),
    );
    add("deselect", "Deselect segment", "Navigation", () =>
      store.patch({ selected: null }),
    );
  }
  for (const asset of project.assets) {
    add(
      `asset-${asset.id}`,
      `Add ${asset.name} to timeline`,
      "Media",
      () => store.safe(() => addAsset(asset.id)),
      {
        disabled: assetFiles.has(asset.id)
          ? undefined
          : "Relink the missing file first",
      },
    );
    add(
      `asset-actions-${asset.id}`,
      `Media actions for ${asset.name}`,
      "Media",
      () =>
        window.dispatchEvent(
          new CustomEvent("sequence-media-actions", { detail: asset.id }),
        ),
      { keywords: "remove delete relink restore file" },
    );
  }
  for (const segment of project.clips)
    add(
      `clip-${segment.id}`,
      `Select segment ${segment.name}`,
      "Segments",
      () => {
        store.patch({ selected: segment.id });
        transport.seek(segment.start);
      },
      { keywords: `${segment.kind} properties transform animation audio` },
    );
  return commands;
}
