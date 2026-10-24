import { describe, expect, it, vi, afterEach } from "vitest";
import {
  clipboardFiles,
  readClipboardMedia,
} from "../src/core/media-clipboard";

afterEach(() => vi.unstubAllGlobals());

describe("media clipboard", () => {
  it("prefers files and falls back to file items, accepting known extensions without MIME types", () => {
    const file = new File(["image"], "image.png", { type: "image/png" });
    const sound = new File(["sound"], "sound.flac");
    const text = new File(["text"], "notes.txt", { type: "text/plain" });
    const items = [{ kind: "file", getAsFile: () => file }];
    expect(
      clipboardFiles({
        files: [sound, text],
        items,
      } as unknown as DataTransfer),
    ).toEqual([sound]);
    expect(
      clipboardFiles({ files: [], items } as unknown as DataTransfer),
    ).toEqual([file]);
  });
  it("imports a clipboard item only once even with multiple image encodings", async () => {
    const getType = vi.fn(async (type) => new Blob(["image"], { type }));
    vi.stubGlobal("navigator", {
      clipboard: {
        read: async () => [
          { types: ["text/html", "image/png", "image/jpeg"], getType },
        ],
      },
    });
    const files = await readClipboardMedia();
    expect(files).toHaveLength(1);
    expect(files[0].name).toMatch(/\.png$/);
    expect(getType).toHaveBeenCalledOnce();
  });
  it("offers useful feedback for unsupported, empty, and permission-denied clipboard access", async () => {
    vi.stubGlobal("navigator", {});
    await expect(readClipboardMedia()).rejects.toThrow("Ctrl+V");
    vi.stubGlobal("navigator", {
      clipboard: { read: async () => [{ types: ["text/plain"] }] },
    });
    await expect(readClipboardMedia()).rejects.toThrow("No media found");
    vi.stubGlobal("navigator", {
      clipboard: {
        read: async () => {
          throw new Error("denied");
        },
      },
    });
    await expect(readClipboardMedia()).rejects.toThrow(
      "Clipboard access is unavailable",
    );
  });
});
