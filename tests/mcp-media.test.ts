import { afterEach, describe, expect, it, vi } from "vitest";
import { receiveMedia } from "../src/core/mcp-media";
const file = {
  id: "65814259-e556-4665-93d7-fd61c6b9d0ca",
  name: "clip.mp4",
  type: "video/mp4",
  size: 3,
};
const context = {
  endpoint: "ws://127.0.0.1:4321/bridge",
  token: "a".repeat(48),
  signal: new AbortController().signal,
};
afterEach(() => vi.unstubAllGlobals());
describe("binary MCP media", () => {
  it("uses only the paired loopback endpoint and authorization header without exposing credentials in URLs", async () => {
    const fetcher = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])));
    vi.stubGlobal("fetch", fetcher);
    const result = await receiveMedia(file, context);
    expect(result.name).toBe("clip.mp4");
    expect(result.size).toBe(3);
    expect(result.type).toBe("video/mp4");
    const [url, options] = fetcher.mock.calls[0] as unknown as [
      URL,
      RequestInit,
    ];
    expect(url.href).toBe(`http://127.0.0.1:4321/media/${file.id}`);
    expect(url.href).not.toContain(context.token);
    expect(options.headers).toEqual({
      Authorization: `Bearer ${context.token}`,
    });
    expect(options.signal).toBe(context.signal);
    expect(options.redirect).toBe("error");
  });
  it("rejects expired transfers and incomplete bytes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 404 })),
    );
    await expect(receiveMedia(file, context)).rejects.toThrow("404");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(new Uint8Array([1]))),
    );
    await expect(receiveMedia(file, context)).rejects.toThrow(
      "Incomplete transfer",
    );
  });
});
