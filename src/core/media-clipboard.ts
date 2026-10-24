const mediaType = /^(image|video|audio)\//;
const mediaExtension =
  /\.(mp4|webm|mov|mkv|m4v|avi|mp3|wav|m4a|aac|ogg|flac|png|jpe?g|webp|gif|avif|bmp)$/i;

export const isMediaFile = (file: File) =>
  mediaType.test(file.type) || mediaExtension.test(file.name);

export function clipboardFiles(data: Pick<DataTransfer, "files" | "items">) {
  // Some browsers expose file items without populating FileList.
  const files = Array.from(data.files);
  return (
    files.length
      ? files
      : Array.from(data.items)
          .filter((item) => item.kind === "file")
          .map((item) => item.getAsFile())
          .filter((file): file is File => file !== null)
  ).filter(isMediaFile);
}

export async function readClipboardMedia(): Promise<File[]> {
  if (!navigator.clipboard?.read)
    throw new Error("Use ⌘V / Ctrl+V here to paste media, or browse files.");
  let items: ClipboardItem[];
  try {
    items = await navigator.clipboard.read();
  } catch {
    throw new Error(
      "Clipboard access is unavailable. Press ⌘V / Ctrl+V here to paste, or browse files.",
    );
  }
  const files: File[] = [];
  for (const item of items) {
    // A single item can offer several encodings of the same image. Import once.
    const type = item.types.find((type) => mediaType.test(type));
    if (!type) continue;
    const blob = await item.getType(type);
    const extension = type.split("/")[1].replace("jpeg", "jpg").split("+")[0];
    files.push(
      new File(
        [blob],
        `Clipboard ${new Date().toISOString().replace(/[:.]/g, "-")} ${files.length + 1}.${extension}`,
        { type },
      ),
    );
  }
  if (!files.length)
    throw new Error(
      "No media found on the clipboard. Copy an image or media file, then paste here. You can also drop or browse files.",
    );
  return files;
}
