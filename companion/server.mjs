#!/usr/bin/env node
/** Optional, loopback-only MCP companion. The browser still renders all media. */
import { createServer } from "node:http";
import { readFile, realpath } from "node:fs/promises";
import { resolve, dirname, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { WebSocketServer } from "ws";
import { McpServer, fromJsonSchema } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { tools, toolCatalog, serverVersion } from "./contracts.ts";
import { createMediaTransfers } from "./media.mjs";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const port = Number(process.env.SEQUENCE_PORT || 0);
const token = randomBytes(24).toString("hex");
const allowed = [];
let local = false;
let anywhere = false;
let activeServer;
let editorUrl = new URL("https://alamkanak.github.io/sequence/");
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg === "--allow-media" && process.argv[i + 1])
    allowed.push(await realpath(process.argv[++i]));
  else if (arg === "--editor-url" && process.argv[i + 1])
    editorUrl = new URL(process.argv[++i]);
  else if (arg === "--local") local = true;
  else if (arg === "--allow-media-anywhere") anywhere = true;
  else if (arg === "--help") {
    console.log(
      "Sequence MCP\n\nConnects your AI client to https://alamkanak.github.io/sequence/.\nCall connect_editor, open its link, and approve the connection in the editor.\n\nOptions:\n  --allow-media <directory>  Allow agent imports from this directory (repeatable)\n  --allow-media-anywhere    Allow agent imports from any readable directory\n  --editor-url <url>         Use another trusted editor deployment\n  --local                    Serve a local dist/ build instead\n\nRequires Node.js 24+. SEQUENCE_PORT optionally fixes the loopback port.",
    );
    process.exit(0);
  } else throw new Error(`Unknown or incomplete option: ${arg}`);
}
if (
  editorUrl.username ||
  editorUrl.password ||
  (editorUrl.protocol !== "https:" &&
    !(
      editorUrl.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(editorUrl.hostname)
    ))
)
  throw new Error(
    "The editor URL must use HTTPS or a local development server",
  );
if (!Number.isInteger(port) || port < 0 || port > 65535)
  throw new Error("SEQUENCE_PORT must be an integer from 0 to 65535");
const matches = (value) =>
  typeof value === "string" &&
  /^[a-f0-9]{48}$/.test(value) &&
  timingSafeEqual(Buffer.from(value), Buffer.from(token));
let host;
let pairingUrl;
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
const transfers = createMediaTransfers({
  allowed,
  anywhere,
  getBrowser: () => browser,
  getOrigin: () => editorUrl.origin,
  getHost: () => host,
  matches,
});
const web = createServer(async (req, res) => {
  try {
    if (req.headers.host !== host) {
      res.writeHead(403).end("Invalid Host");
      return;
    }
    const url = new URL(req.url, `http://${host}`);
    if (await transfers.handle(req, res, url)) return;
    if (!local) {
      res
        .writeHead(404)
        .end("Connect through your AI app using connect_editor.");
      return;
    }
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
    if (res.headersSent) {
      res.destroy();
      return;
    }
    res
      .writeHead(404)
      .end(
        "Use the GitHub Pages editor. For --local, run npm run build first.",
      );
  }
});
const wss = new WebSocketServer({
  noServer: true,
  maxPayload: 128 * 1024 * 1024,
});
web.on("upgrade", (req, socket, head) => {
  let url;
  try {
    url = new URL(req.url, `http://${host}`);
  } catch {
    socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
    socket.destroy();
    return;
  }
  if (
    req.headers.host !== host ||
    req.headers.origin !== editorUrl.origin ||
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
  const client = activeServer?.server.getClientVersion();
  ws.send(
    JSON.stringify({
      type: "connection",
      info: {
        serverName: "sequence-editor",
        serverVersion,
        client: client ? { name: client.name, version: client.version } : null,
        mediaAccess: transfers.access(),
      },
    }),
  );
  let alive = true;
  ws.on("pong", () => {
    alive = true;
  });
  const heartbeat = setInterval(() => {
    if (ws.readyState !== 1) return;
    if (!alive) {
      ws.terminate();
      return;
    }
    alive = false;
    ws.ping();
    ws.send(JSON.stringify({ type: "heartbeat" }));
  }, 2000);
  ws.on("error", () => ws.close());
  ws.on("message", (data) => {
    try {
      const m = JSON.parse(String(data));
      const request = pending.get(m.id);
      if (!request) return;
      if (m.type === "progress") {
        request.timer.refresh();
        return;
      }
      clearTimeout(request.timer);
      pending.delete(m.id);
      m.error ? request.reject(new Error(m.error)) : request.resolve(m.result);
    } catch {
      /* Malformed frames do not execute commands. */
    }
  });
  ws.on("close", () => {
    clearInterval(heartbeat);
    if (browser !== ws) return;
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
      "Call connect_editor and ask the user to open its pairing URL and approve the connection. Keep the editor tab open.",
    );
  const id = randomUUID();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error("Editor request timed out"));
    }, 60000);
    pending.set(id, { resolve, reject, timer });
    browser.send(JSON.stringify({ id, tool, args }), (error) => {
      if (!error) return;
      clearTimeout(timer);
      pending.delete(id);
      reject(error);
    });
  });
}
function buildServer() {
  const mcp = new McpServer({
    name: "sequence-editor",
    version: serverVersion,
  });
  for (const definition of toolCatalog()) {
    const { name, title, description, inputSchema, outputSchema } = definition;
    mcp.registerTool(
      name,
      {
        title,
        description,
        inputSchema: fromJsonSchema(inputSchema),
        outputSchema: fromJsonSchema(outputSchema),
      },
      async (input) => {
        let args = tools[name].input.parse(input);
        let transfer;
        try {
          if (name === "connect_editor") {
            const result = {
              connected: browser?.readyState === 1,
              url: pairingUrl,
              instructions:
                "Open this link in desktop Chrome or Edge, approve Connect AI agent, and allow local network access if prompted. Keep this editor tab open. Then call inspect_project. Only one tab can connect at a time.",
            };
            return {
              content: [{ type: "text", text: JSON.stringify(result) }],
              structuredContent: result,
              resultType: "complete",
            };
          }
          if (name === "manage_assets" && args.action === "import") {
            transfer = await transfers.publish(args.paths);
            args = { action: "import", files: transfer.files };
          }
          const result = await call(name, args);
          if (name === "preview_frame" && result.dataUrl) {
            const [header, data] = result.dataUrl.split(",");
            const mimeType = header.slice(5).split(";")[0];
            return {
              content: [{ type: "image", mimeType, data }],
              structuredContent: { time: result.time, mimeType },
              resultType: "complete",
            };
          }
          return {
            content: [{ type: "text", text: JSON.stringify(result) }],
            structuredContent: Array.isArray(result)
              ? { items: result }
              : result,
            resultType: "complete",
          };
        } catch (e) {
          return {
            isError: true,
            resultType: "complete",
            content: [{ type: "text", text: e.message }],
          };
        } finally {
          await transfer?.release();
        }
      },
    );
  }
  activeServer = mcp;
  return mcp;
}
await new Promise((resolve, reject) => {
  web.once("error", reject);
  web.listen(port, "127.0.0.1", resolve);
});
host = `127.0.0.1:${web.address().port}`;
if (local) editorUrl = new URL(`http://${host}/`);
const parameters = new URLSearchParams({
  bridge: `ws://${host}/bridge`,
  token,
});
editorUrl.hash = `/editor?${parameters}`;
pairingUrl = editorUrl.href;
console.error(`Sequence editor: ${pairingUrl}`);
console.error(
  `MCP stdio ready. Media access: ${anywhere ? "any readable directory" : `${allowed.length} allowed directories`}. The browser must stay open.`,
);
serveStdio(buildServer);
function shutdown() {
  browser?.terminate();
  wss.close();
  web.close();
  process.exit(0);
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
process.stdin.once("end", shutdown);
