import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import assert from "node:assert/strict";
import WebSocket from "ws";
import { createServer } from "node:http";

const version = JSON.parse(await readFile("package.json", "utf8")).version;
let packageSource =
  process.env.SEQUENCE_MCP_PACKAGE ||
  (process.argv.includes("--package")
    ? resolve(`dist/mcp/sequence-mcp-${version}.tgz`)
    : undefined);
let packageServer;
if (packageSource && !/^https?:\/\//.test(packageSource)) {
  const tarball = await readFile(packageSource);
  packageServer = createServer((_req, response) => {
    response.writeHead(200, { "Content-Type": "application/octet-stream" });
    response.end(tarball);
  });
  await new Promise((resolve, reject) => {
    packageServer.once("error", reject);
    packageServer.listen(0, "127.0.0.1", resolve);
  });
  packageSource = `http://127.0.0.1:${packageServer.address().port}/sequence-mcp-${version}.tgz`;
}
const temporary = await mkdtemp(resolve(tmpdir(), "sequence-mcp-test-"));
const args = packageSource
  ? [
      resolve(dirname(process.env.npm_execpath), "npx-cli.js"),
      "--yes",
      packageSource,
    ]
  : [resolve("companion/server.mjs")];
const child = spawn(process.execPath, args, {
  cwd: temporary,
  detached: process.platform !== "win32",
  env: { ...process.env, SEQUENCE_PORT: "0" },
  stdio: ["pipe", "pipe", "pipe"],
});
let next = 0;
let browser;
const requests = new Map();
let stderr = "";
child.stderr.on("data", (chunk) => {
  stderr += chunk;
});
const failRequests = (message) => {
  for (const finish of requests.values()) finish({ error: { message } });
  requests.clear();
};
child.once("error", (error) => failRequests(error.message));
child.once("exit", (code) =>
  failRequests(`MCP process exited (${code}): ${stderr}`),
);
const timer = setTimeout(
  () => {
    console.error(`MCP test timed out\n${stderr}`);
    stop();
    failRequests("MCP test timed out");
    process.exitCode = 1;
  },
  packageSource ? 120000 : 20000,
);
function stop() {
  if (process.platform !== "win32") {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {}
  } else child.kill();
}
createInterface({ input: child.stdout }).on("line", (line) => {
  try {
    const message = JSON.parse(line);
    if (requests.has(message.id)) {
      requests.get(message.id)(message);
      requests.delete(message.id);
    }
  } catch {
    assert.fail(`Protocol noise on stdout: ${line}`);
  }
});
const call = (method, params) =>
  new Promise((resolve) => {
    const id = ++next;
    requests.set(id, resolve);
    child.stdin.write(
      JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n",
    );
  });
const tool = async (name, args = {}) =>
  (await call("tools/call", { name, arguments: args })).result;
const rejected = (url, origin, headers) =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(url, { origin, headers });
    ws.once("unexpected-response", (_req, response) => {
      response.resume();
      resolve(response.statusCode);
    });
    ws.once("error", reject);
    ws.once("open", () => {
      ws.close();
      reject(new Error("Unexpected bridge authorization"));
    });
  });
try {
  const init = await call("initialize", {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: { name: "sequence-test", version: "1" },
  });
  assert.ok(init.result, JSON.stringify(init));
  child.stdin.write(
    JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) +
      "\n",
  );
  const list = await call("tools/list", {});
  assert.equal(list.result.tools.length, 7);
  assert.ok(list.result.tools.some((t) => t.name === "connect_editor"));
  assert.ok(list.result.tools.some((t) => t.name === "apply_edits"));
  const inspection = await tool("inspect_project");
  assert.equal(inspection.isError, true);
  assert.match(inspection.content[0].text, /connect_editor/);
  const pair = (await tool("connect_editor")).structuredContent;
  assert.equal(pair.connected, false);
  const page = new URL(pair.url);
  assert.equal(page.origin, "https://alamkanak.github.io");
  assert.equal(page.pathname, "/sequence/");
  const params = new URLSearchParams(page.hash.split("?")[1]);
  assert.match(params.get("token"), /^[a-f0-9]{48}$/);
  const bridge = new URL(params.get("bridge"));
  assert.equal(bridge.hostname, "127.0.0.1");
  const connectUrl = `${bridge}?token=${params.get("token")}`;
  assert.equal(await rejected(connectUrl, "https://attacker.example"), 403);
  assert.equal(await rejected(`${bridge}?token=bad`, page.origin), 403);
  assert.equal(
    await rejected(`${bridge}?token=${"é".repeat(48)}`, page.origin),
    403,
  );
  assert.equal(
    await rejected(connectUrl, page.origin, { Host: "attacker.example" }),
    403,
  );
  const outside = await tool("manage_assets", {
    action: "import",
    paths: [resolve("README.md")],
  });
  assert.equal(outside.isError, true);

  browser = new WebSocket(connectUrl, { origin: page.origin });
  await new Promise((resolve, reject) => {
    browser.once("open", resolve);
    browser.once("error", reject);
  });
  browser.on("message", (raw) => {
    const request = JSON.parse(String(raw));
    browser.send(
      JSON.stringify({
        id: request.id,
        result: { project: { id: "paired-project", revision: 3 } },
      }),
    );
  });
  assert.equal(
    (await tool("connect_editor")).structuredContent.connected,
    true,
  );
  assert.equal(await rejected(connectUrl, page.origin), 409);
  const forwarded = await tool("inspect_project");
  assert.equal(forwarded.structuredContent.project.id, "paired-project");
  await new Promise((resolve) => {
    browser.once("close", resolve);
    browser.close();
  });
  browser = undefined;
  assert.equal(
    (await tool("connect_editor")).structuredContent.connected,
    false,
  );
  assert.equal((await tool("inspect_project")).isError, true);
  const exitCode = await new Promise((resolve, reject) => {
    const deadline = setTimeout(
      () =>
        reject(
          new Error("Companion did not stop when the AI client disconnected"),
        ),
      5000,
    );
    child.once("exit", (code) => {
      clearTimeout(deadline);
      resolve(code);
    });
    child.stdin.end();
  });
  assert.equal(exitCode, 0);
  console.log(
    `MCP: ${packageSource ? "installed package, " : ""}stdio, seven tools, hosted pairing, origin/token/Host protection, single-tab control, request forwarding, disconnect, and process shutdown passed.`,
  );
} finally {
  clearTimeout(timer);
  browser?.close();
  stop();
  packageServer?.close();
  await rm(temporary, { recursive: true, force: true });
}
