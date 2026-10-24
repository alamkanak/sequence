import { open, realpath } from "node:fs/promises";
import { basename, extname, sep } from "node:path";
import { randomUUID } from "node:crypto";
import { pipeline } from "node:stream/promises";

const types = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mkv": "video/x-matroska",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".flac": "audio/flac",
  ".ogg": "audio/ogg",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".bmp": "image/bmp",
};

/** Short-lived transfer handles, scoped to the approved editor and import call. */
export function createMediaTransfers({
  allowed,
  anywhere,
  getBrowser,
  getOrigin,
  getHost,
  matches,
}) {
  const entries = new Map();
  const access = () => ({
    mode: anywhere ? "anywhere" : allowed.length ? "directories" : "none",
    directories: allowed,
  });
  async function publish(paths) {
    const published = [];
    async function release() {
      for (const item of published) {
        entries.delete(item.id);
        for (const stream of item.streams) stream.destroy();
        await item.handle.close().catch(() => {});
      }
    }
    try {
      for (const path of paths) {
        const actual = await realpath(path);
        if (
          !anywhere &&
          !allowed.some(
            (dir) =>
              actual === dir ||
              actual.startsWith(dir.endsWith(sep) ? dir : dir + sep),
          )
        )
          throw new Error(
            "File is outside --allow-media directories. Add its directory or use --allow-media-anywhere.",
          );
        const handle = await open(actual, "r");
        const item = {
          id: randomUUID(),
          handle,
          streams: new Set(),
          owner: getBrowser(),
        };
        published.push(item);
        const info = await handle.stat();
        if (!info.isFile())
          throw new Error("Media import requires a regular file");
        Object.assign(item, {
          name: basename(actual),
          type:
            types[extname(actual).toLowerCase()] || "application/octet-stream",
          size: info.size,
        });
        entries.set(item.id, item);
      }
      return {
        files: published.map(({ id, name, type, size }) => ({
          id,
          name,
          type,
          size,
        })),
        release,
      };
    } catch (error) {
      await release();
      throw error;
    }
  }
  async function handle(req, res, url) {
    if (!url.pathname.startsWith("/media/")) return false;
    const sameOrigin =
      !req.headers.origin &&
      req.headers["sec-fetch-site"] === "same-origin" &&
      getOrigin() === `http://${getHost()}`;
    if (req.headers.origin !== getOrigin() && !sameOrigin) {
      res.writeHead(403).end("Invalid Origin");
      return true;
    }
    res.setHeader("Access-Control-Allow-Origin", getOrigin());
    res.setHeader("Vary", "Origin");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Authorization");
      res.setHeader("Access-Control-Allow-Private-Network", "true");
      res.writeHead(204).end();
      return true;
    }
    if (
      !matches(req.headers.authorization?.replace(/^Bearer /, "")) ||
      getBrowser()?.readyState !== 1
    ) {
      res.writeHead(403).end("Editor authorization required");
      return true;
    }
    const item = entries.get(url.pathname.slice("/media/".length));
    if (!item || item.owner !== getBrowser()) {
      res.writeHead(404).end("Transfer expired");
      return true;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405).end();
      return true;
    }
    res.writeHead(200, {
      "Content-Type": item.type,
      "Content-Length": item.size,
    });
    if (req.method === "HEAD") {
      res.end();
      return true;
    }
    const stream = item.handle.createReadStream({ autoClose: false, start: 0 });
    item.streams.add(stream);
    try {
      await pipeline(stream, res);
    } catch {
      res.destroy();
    } finally {
      item.streams.delete(stream);
    }
    return true;
  }
  return { access, publish, handle };
}
