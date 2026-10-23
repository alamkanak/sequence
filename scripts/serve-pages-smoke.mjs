import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
const root = "/private/tmp/sequence-pages-build",
  prefix = "/pages-smoke/";
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".mp4": "video/mp4",
  ".wav": "audio/wav",
  ".jpg": "image/jpeg",
};
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1:5175");
    if (!url.pathname.startsWith(prefix)) {
      res.writeHead(404).end();
      return;
    }
    const relative =
      decodeURIComponent(url.pathname.slice(prefix.length)) || "index.html";
    const path = resolve(root, relative);
    if (!path.startsWith(root + "/")) {
      res.writeHead(403).end();
      return;
    }
    res.writeHead(200, {
      "Content-Type": types[extname(path)] || "application/octet-stream",
    });
    res.end(await readFile(path));
  } catch {
    res.writeHead(404).end();
  }
}).listen(5175, "127.0.0.1", () =>
  console.log("Pages subpath test: http://127.0.0.1:5175/pages-smoke/"),
);
