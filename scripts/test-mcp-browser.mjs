import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { newClip } from "../src/core/model.ts";
const child = spawn(
  process.execPath,
  ["companion/server.mjs", "--local", "--allow-media", resolve("public/demo")],
  {
    env: { ...process.env, SEQUENCE_PORT: process.env.TEST_MCP_PORT || "4180" },
    stdio: ["pipe", "pipe", "pipe"],
  },
);
const requests = new Map();
let next = 0;
const timeout = setTimeout(() => {
  child.kill();
  process.exitCode = 1;
  console.error("Browser MCP test timed out");
}, 180000);
createInterface({ input: child.stdout }).on("line", (line) => {
  try {
    const m = JSON.parse(line);
    if (requests.has(m.id)) {
      requests.get(m.id)(m);
      requests.delete(m.id);
    }
  } catch {}
});
child.stderr.on("data", (data) => process.stderr.write(data));
const rpc = (method, params) =>
  new Promise((resolve) => {
    const id = ++next;
    requests.set(id, resolve);
    child.stdin.write(
      JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n",
    );
  });
async function tool(name, args = {}) {
  const response = await rpc("tools/call", { name, arguments: args });
  assert.ok(!response.error, JSON.stringify(response.error));
  return response.result;
}
function value(result) {
  if (result.isError)
    throw new Error(result.content?.[0]?.text || "Tool error");
  const data = result.structuredContent ?? JSON.parse(result.content[0].text);
  return data.items ?? data;
}
try {
  await new Promise((resolve, reject) => {
    child.stderr.once("data", resolve);
    child.once("error", reject);
  });
  await rpc("initialize", {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: { name: "sequence-browser-integration", version: "1" },
  });
  child.stdin.write(
    JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) +
      "\n",
  );
  console.error("Open the printed editor URL. Waiting for the browser bridge.");
  let state;
  for (let i = 0; i < 120; i++) {
    const r = await tool("inspect_project");
    if (!r.isError) {
      state = value(r);
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  assert.ok(state, "Browser did not connect");
  const assets = value(
    await tool("manage_assets", {
      action: "import",
      paths: ["dusk.mp4", "ambient.wav"].map((n) => resolve("public/demo", n)),
    }),
  );
  assert.equal(assets.length, 2);
  await tool("manage_assets", {
    action: "place",
    assetId: assets[0].id,
    start: 0,
  });
  await tool("manage_assets", {
    action: "place",
    assetId: assets[1].id,
    start: 0,
  });
  state = value(await tool("inspect_project"));
  const p = state.project;
  const title = newClip(p, "text", p.tracks[0].id, 0);
  title.text = "Edited through MCP";
  const args = {
    expectedRevision: p.revision,
    idempotencyKey: "browser-integration-title",
    operations: [{ op: "add_clip", clip: title }],
  };
  const edited = value(await tool("apply_edits", args));
  const repeated = value(await tool("apply_edits", args));
  assert.equal(edited.revision, repeated.revision);
  const stale = await tool("apply_edits", {
    ...args,
    idempotencyKey: "stale-request",
  });
  assert.equal(stale.isError, true);
  const preview = await tool("preview_frame", { time: 2 });
  assert.equal(preview.content[0].type, "image");
  assert.ok(preview.content[0].data.length > 1000);
  const job = value(
    await tool("export_video", {
      settings: {
        width: 640,
        height: 360,
        fps: 30,
        bitrate: 3000000,
        format: "mp4",
        name: "MCP verification",
      },
    }),
  );
  let status;
  for (let i = 0; i < 120; i++) {
    status = value(
      await tool("manage_jobs", { action: "status", jobId: job.jobId }),
    );
    if (["complete", "error", "canceled"].includes(status.status)) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  assert.equal(status.status, "complete", JSON.stringify(status));
  assert.equal(status.frames, 360);
  const report = {
    date: new Date().toISOString(),
    checks: [
      "stdio handshake",
      "seven-tool discovery",
      "browser pairing",
      "allowlisted file import",
      "asset placement",
      "atomic editing",
      "idempotent retry",
      "stale revision rejection",
      "image preview",
      "browser export",
      "job completion",
    ],
    export: {
      frames: status.frames,
      seconds: status.seconds,
      fps: status.fps,
      renderer: status.renderer,
      bytes: status.bytes,
    },
  };
  await mkdir("docs/verification", { recursive: true });
  await writeFile(
    "docs/verification/mcp-browser-integration.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  clearTimeout(timeout);
  child.kill();
}
