import { useEffect, useMemo, useState } from "react";
import { createFileDropTarget } from "../core/file-drop";
import { clipboardFiles } from "../core/media-clipboard";
import { Button, Modal, cn, skin } from "./ui";
import { CopyIcon, FolderOpenIcon, UploadSimpleIcon } from "./icons";

export function ImportDialog({
  onClose,
  onBrowse,
  onFiles,
  importing,
  error,
  onError,
  onPasteClipboard,
  readingClipboard,
}: {
  onClose: () => void;
  onBrowse: () => void;
  onFiles: (files: File[]) => void;
  importing: boolean;
  error: string;
  onError: (message: string) => void;
  onPasteClipboard: () => void;
  readingClipboard: boolean;
}) {
  const [dropping, setDropping] = useState(false);
  const drop = useMemo(
    () => createFileDropTarget(onFiles, setDropping),
    [onFiles],
  );
  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      if (
        event.defaultPrevented ||
        !event.clipboardData ||
        Array.from(document.querySelectorAll('[role="dialog"]'))
          .at(-1)
          ?.getAttribute("aria-label") !== "Import media"
      )
        return;
      if (clipboardFiles(event.clipboardData).length) {
        onError("");
        return;
      }
      event.preventDefault();
      onError(
        "No media found on the clipboard. Copy an image or media file, then paste here. You can also drop or browse files.",
      );
    };
    window.addEventListener("paste", paste);
    return () => window.removeEventListener("paste", paste);
  }, [onError]);
  return (
    <Modal title="Import media" onClose={onClose}>
      <div {...drop} className="space-y-4">
        <div
          className={cn(
            "flex min-h-44 flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
            dropping ? "border-indigo-500 bg-indigo-500/10" : skin.border,
          )}
        >
          <UploadSimpleIcon
            size={32}
            className="text-indigo-600 [[data-theme=dark]_&]:text-indigo-300"
          />
          <p className="text-sm font-medium">
            {importing
              ? "Reading your media…"
              : dropping
                ? "Drop to import"
                : "Drop files here"}
          </p>
          <p className={cn("text-xs leading-relaxed", skin.muted)}>
            Videos, audio, images, and GIFs
            <br />
            Choose multiple files at once.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="primary"
            disabled={importing || readingClipboard}
            onClick={onBrowse}
          >
            <FolderOpenIcon size={16} /> Browse files
          </Button>
          <Button
            disabled={importing || readingClipboard}
            onClick={onPasteClipboard}
          >
            <CopyIcon size={16} />{" "}
            {readingClipboard ? "Reading clipboard…" : "Paste from clipboard"}
          </Button>
        </div>
        <p className={cn("text-center text-xs", skin.muted)}>
          Or press <kbd className="font-medium">⌘V / Ctrl+V</kbd> to paste media
          here.
        </p>
        {error && (
          <p
            role="status"
            className="rounded-md bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-700 [[data-theme=dark]_&]:text-amber-300"
          >
            {error}
          </p>
        )}
        <p
          className={cn(
            "border-t pt-4 text-center text-xs",
            skin.border,
            skin.muted,
          )}
        >
          Your media stays on your device.
        </p>
      </div>
    </Modal>
  );
}
