#!/usr/bin/env node
/** Optional, loopback-only MCP companion. The browser still renders all media. */
import { createServer } from "node:http";
import { readFile, realpath, stat } from "node:fs/promises";
import { resolve, dirname, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { WebSocketServer } from "ws";
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const port = Number(process.env.SEQUENCE_PORT || 4174);
const token = randomBytes(24).toString("hex");
const allowed = [];
for (let i = 2; i < process.argv.length; i++)
  if (process.argv[i] === "--allow-media" && process.argv[i + 1])
    allowed.push(await realpath(process.argv[++i]));
const matches = (value) =>
  typeof value === "string" &&
  value.length === token.length &&
  timingSafeEqual(Buffer.from(value), Buffer.from(token));
const host = `127.0.0.1:${port}`;
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".mp4": "video/mp4",
  ".wav": "audio/wav",
  ".jpg": "image/jpeg",
  ".json": "application/json",
};
let browser;
const pending = new Map();
const web = createServer(async (req, res) => {
  try {
    if (req.headers.host !== host) {
      res.writeHead(403).end("Invalid Host");
      return;
    }
    const url = new URL(req.url, `http://${host}`);
    const relative = decodeURIComponent(url.pathname);
    const path = resolve(
      root,
      "." + (relative === "/" ? "/index.html" : relative),
    );
    if (!path.startsWith(root + sep)) {
      res.writeHead(403).end();
      return;
    }
    const data = await readFile(path);
    res.writeHead(200, {
      "Content-Type": mime[extname(path)] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    });
    res.end(data);
  } catch {
    res.writeHead(404).end("Build the app with npm run build first.");
  }
});
const wss = new WebSocketServer({
  noServer: true,
  maxPayload: 128 * 1024 * 1024,
});
web.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url, `http://${host}`);
  if (
    req.headers.host !== host ||
    req.headers.origin !== `http://${host}` ||
    url.pathname !== "/bridge" ||
    !matches(url.searchParams.get("token"))
  ) {
    socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
    socket.destroy();
    return;
  }
  if (browser) {
    socket.write("HTTP/1.1 409 Conflict\r\n\r\n");
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
});
wss.on("connection", (ws) => {
  browser = ws;
  ws.on("message", (data) => {
    try {
      const m = JSON.parse(String(data));
      const request = pending.get(m.id);
      if (!request) return;
      clearTimeout(request.timer);
      pending.delete(m.id);
      m.error ? request.reject(new Error(m.error)) : request.resolve(m.result);
    } catch {
      /* Malformed frames do not execute commands. */
    }
  });
  ws.on("close", () => {
    browser = undefined;
    for (const p of pending.values()) {
      clearTimeout(p.timer);
      p.reject(new Error("Editor disconnected"));
    }
    pending.clear();
  });
});
async function call(tool, args) {
  if (!browser || browser.readyState !== 1)
    throw new Error(
      "Open the local editor URL printed by the companion and keep it connected.",
    );
  const id = randomUUID();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error("Editor request timed out"));
    }, 60000);
    pending.set(id, { resolve, reject, timer });
    browser.send(JSON.stringify({ id, tool, args }));
  });
}
const operations = z
  .array(
    z
      .object({
        op: z.enum([
          "project",
          "add_track",
          "update_track",
          "delete_track",
          "add_clip",
          "update_clip",
          "delete_clip",
          "delete_asset",
          "split",
          "transition",
          "undo",
          "redo",
        ]),
      })
      .passthrough(),
  )
  .max(500);
function buildServer() {
  const mcp = new McpServer({ name: "sequence-editor", version: "0.1.0" });
  const tools = [
    [
      "inspect_project",
      "Inspect the connected project, revision, stable IDs and codec/element capabilities.",
      z.object({}),
    ],
    [
      "manage_assets",
      "List assets, place an imported asset, or import local files from a command-line allowed directory. Large media should use the browser file picker.",
      z.object({
        action: z.enum(["list", "place", "import"]),
        assetId: z.string().optional(),
        trackId: z.string().optional(),
        start: z.number().nonnegative().optional(),
        paths: z.array(z.string()).max(20).optional(),
      }),
    ],
    [
      "apply_edits",
      "Apply an atomic typed editing batch. Inspect the project first; supply expectedRevision and a unique idempotencyKey. Supports validateOnly.",
      z.object({
        expectedRevision: z.number().int().nonnegative(),
        idempotencyKey: z.string().min(1).max(160),
        validateOnly: z.boolean().optional(),
        operations,
      }),
    ],
    [
      "preview_frame",
      "Render a timestamp and return the composed image.",
      z.object({ time: z.number().nonnegative() }),
    ],
    [
      "export_video",
      "Start a browser-local export; returns a job ID. Default is SDR MP4/H.264/AAC.",
      z.object({
        settings: z
          .object({
            name: z.string().max(200).optional(),
            width: z.number().int().min(16).max(7680).optional(),
            height: z.number().int().min(16).max(7680).optional(),
            fps: z.number().min(1).max(120).optional(),
            bitrate: z.number().min(100000).max(100000000).optional(),
            format: z.enum(["mp4", "webm"]).optional(),
            audio: z.boolean().optional(),
            allowToneMap: z.boolean().optional(),
          })
          .optional(),
      }),
    ],
    [
      "manage_jobs",
      "Read export status, progress and completion metadata, or cancel an export.",
      z.object({
        action: z.enum(["status", "cancel"]).default("status"),
        jobId: z.string().optional(),
      }),
    ],
  ];
  for (const [name, description, inputSchema] of tools)
    mcp.registerTool(name, { description, inputSchema }, async (args) => {
      try {
        if (name === "manage_assets" && args.action === "import") {
          const files = [];
          for (const path of args.paths || []) {
            const actual = await realpath(path);
            if (
              !allowed.some(
                (dir) => actual === dir || actual.startsWith(dir + sep),
              )
            )
              throw new Error("File is outside --allow-media directories");
            if ((await stat(actual)).size > 64 * 1024 * 1024)
              throw new Error(
                "Use the browser file picker for files larger than 64 MiB",
              );
            files.push({
              name: actual.split(sep).pop(),
              type:
                extname(actual) === ".wav"
                  ? "audio/wav"
                  : extname(actual) === ".mp3"
                    ? "audio/mpeg"
                    : extname(actual) === ".png"
                      ? "image/png"
                      : extname(actual) === ".jpg"
                        ? "image/jpeg"
                        : "video/mp4",
              data: (await readFile(actual)).toString("base64"),
            });
          }
          args = { ...args, files };
        }
        const result = await call(name, args);
        if (name === "preview_frame" && result.dataUrl) {
          const [header, data] = result.dataUrl.split(",");
          return {
            content: [
              { type: "image", mimeType: header.slice(5).split(";")[0], data },
            ],
            resultType: "complete",
          };
        }
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
          structuredContent: Array.isArray(result) ? { items: result } : result,
          resultType: "complete",
        };
      } catch (e) {
        return {
          isError: true,
          resultType: "complete",
          content: [{ type: "text", text: e.message }],
        };
      }
    });
  return mcp;
}
await new Promise((resolve, reject) => {
  web.once("error", reject);
  web.listen(port, "127.0.0.1", resolve);
});
console.error(`Sequence editor: http://${host}/#/editor?token=${token}`);
console.error(
  `MCP stdio ready. Allowed media directories: ${allowed.length}. The browser must stay open.`,
);
serveStdio(buildServer);
process.on("SIGINT", () => {
  wss.close();
  web.close();
  process.exit(0);
});
