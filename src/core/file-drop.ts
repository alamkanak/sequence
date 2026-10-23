export interface FileDragEvent {
  dataTransfer: Pick<DataTransfer, "types" | "files" | "dropEffect">;
  defaultPrevented: boolean;
  preventDefault(): void;
  stopPropagation(): void;
}

/** One drop target owns the import; nested targets never import the same event. */
export function createFileDropTarget(
  onFiles: (files: File[]) => void,
  onActive: (active: boolean) => void = () => {},
) {
  let depth = 0;
  const isFiles = (event: FileDragEvent) =>
    Array.from(event.dataTransfer.types).includes("Files") ||
    event.dataTransfer.files.length > 0;
  const claim = (event: FileDragEvent) => {
    if (event.defaultPrevented || !isFiles(event)) return false;
    event.preventDefault();
    event.stopPropagation();
    return true;
  };
  return {
    onDragEnter(event: FileDragEvent) {
      if (!claim(event)) return;
      depth++;
      onActive(true);
    },
    onDragOver(event: FileDragEvent) {
      if (!claim(event)) return;
      event.dataTransfer.dropEffect = "copy";
      onActive(true);
    },
    onDragLeave(event: FileDragEvent) {
      if (!isFiles(event) && !depth) return;
      event.stopPropagation();
      depth = Math.max(0, depth - 1);
      onActive(depth > 0);
    },
    onDrop(event: FileDragEvent) {
      if (!claim(event)) return;
      depth = 0;
      onActive(false);
      const files = Array.from(event.dataTransfer.files);
      if (files.length) onFiles(files);
    },
  };
}
