import { describe, expect, it, vi } from "vitest";
import {
  createFileDropTarget,
  type FileDragEvent,
} from "../src/core/file-drop";

function dragEvent(files: File[] = [], types = ["Files"]): FileDragEvent {
  return {
    dataTransfer: {
      types,
      files: Object.assign([...files], {
        item: (i: number) => files[i] || null,
      }),
      dropEffect: "none",
    },
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopPropagation: vi.fn(),
  };
}

describe("file drop ownership and feedback", () => {
  it("imports a multi-file drop once when nested inside the editor", () => {
    const importMedia = vi.fn(),
      importWorkspace = vi.fn();
    const panel = createFileDropTarget(importMedia);
    const workspace = createFileDropTarget(importWorkspace);
    const files = [new File(["one"], "one.mp4"), new File(["two"], "two.wav")];
    const event = dragEvent(files);
    panel.onDrop(event);
    // Even an already-handled event reaching the parent cannot import twice.
    workspace.onDrop(event);
    expect(event.stopPropagation).toHaveBeenCalledOnce();
    expect(importMedia).toHaveBeenCalledExactlyOnceWith(files);
    expect(importWorkspace).not.toHaveBeenCalled();
  });
  it("keeps the highlight across child boundaries and clears it on drop or exit", () => {
    const active = vi.fn(),
      imported = vi.fn();
    const target = createFileDropTarget(imported, active);
    target.onDragEnter(dragEvent());
    target.onDragEnter(dragEvent());
    target.onDragLeave(dragEvent());
    expect(active).toHaveBeenLastCalledWith(true);
    const over = dragEvent();
    target.onDragOver(over);
    expect(over.dataTransfer.dropEffect).toBe("copy");
    target.onDrop(dragEvent([new File(["video"], "clip.mp4")]));
    expect(active).toHaveBeenLastCalledWith(false);
    target.onDragEnter(dragEvent());
    target.onDragLeave(dragEvent());
    expect(active).toHaveBeenLastCalledWith(false);
    expect(imported).toHaveBeenCalledOnce();
  });
  it("preserves workspace imports outside the panel and ignores non-file drags", () => {
    const imported = vi.fn(),
      active = vi.fn();
    const target = createFileDropTarget(imported, active);
    const text = dragEvent([], ["text/plain"]);
    target.onDragOver(text);
    target.onDrop(text);
    expect(text.defaultPrevented).toBe(false);
    expect(imported).not.toHaveBeenCalled();
    target.onDrop(dragEvent([new File(["audio"], "audio.wav")]));
    expect(imported).toHaveBeenCalledOnce();
  });
});
