import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import assert from "node:assert/strict";
const child = spawn(process.execPath, ["companion/server.mjs"], {
  env: { ...process.env, SEQUENCE_PORT: "4178" },
  stdio: ["pipe", "pipe", "pipe"],
});
let next = 0;
const requests = new Map();
const timer = setTimeout(() => {
  child.kill();
  process.exitCode = 1;
  console.error("MCP test timed out");
}, 15000);
createInterface({ input: child.stdout }).on("line", (line) => {
  try {
    const message = JSON.parse(line);
    if (requests.has(message.id)) {
      requests.get(message.id)(message);
      requests.delete(message.id);
    }
  } catch {
    /* no protocol noise expected */
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
try {
  await new Promise((resolve, reject) => {
    child.stderr.once("data", resolve);
    child.once("error", reject);
  });
  const init = await call("initialize", {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: { name: "sequence-test", version: "1" },
  });
  assert.ok(init.result);
  child.stdin.write(
    JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) +
      "\n",
  );
  const list = await call("tools/list", {});
  assert.equal(list.result.tools.length, 6);
  assert.ok(list.result.tools.some((t) => t.name === "apply_edits"));
  const inspection = await call("tools/call", {
    name: "inspect_project",
    arguments: {},
  });
  assert.equal(inspection.result.isError, true);
  assert.match(inspection.result.content[0].text, /Open the local editor/);
  console.log(
    "MCP: stdio initialization, six-tool discovery, schemas, and disconnected-editor error passed.",
  );
} finally {
  clearTimeout(timer);
  child.kill();
}
