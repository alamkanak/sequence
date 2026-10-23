import { test, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { extname, resolve } from "node:path";

test.use({ channel: process.env.PLAYWRIGHT_CHROMIUM_CHANNEL });

test("HTTPS editor pairs only after approval and supports MCP edits, preview, and export", async ({
  page,
  context,
}) => {
  const origin = "https://sequence.test";
  await context.route(`${origin}/**`, async (route) => {
    const relative = new URL(route.request().url()).pathname.replace(
      /^\/sequence\//,
      "",
    );
    const file = resolve("dist", relative || "index.html");
    const types: Record<string, string> = {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
    };
    await route.fulfill({
      path: file,
      contentType: types[extname(file)] || "application/octet-stream",
    });
  });
  // Model the browser permission the user grants to the hosted editor.
  await context.grantPermissions(["local-network-access"], { origin });
  const child = spawn(
    process.execPath,
    [
      "companion/server.mjs",
      "--editor-url",
      `${origin}/sequence/`,
      "--allow-media",
      resolve("public/demo"),
    ],
    {
      env: { ...process.env, SEQUENCE_PORT: "0" },
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  let next = 0;
  const requests = new Map<number, (value: any) => void>();
  createInterface({ input: child.stdout }).on("line", (line) => {
    const message = JSON.parse(line);
    requests.get(message.id)?.(message);
    requests.delete(message.id);
  });
  const call = (method: string, params: unknown) =>
    new Promise<any>((resolve) => {
      const id = ++next;
      requests.set(id, resolve);
      child.stdin.write(
        JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n",
      );
    });
  const tool = async (name: string, args: unknown = {}) => {
    const response = await call("tools/call", { name, arguments: args });
    expect(response.error).toBeUndefined();
    expect(response.result.isError, JSON.stringify(response.result)).not.toBe(
      true,
    );
    return response.result;
  };
  try {
    await call("initialize", {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "https-editor-test", version: "1" },
    });
    child.stdin.write(
      JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) +
        "\n",
    );
    const pairing = (await tool("connect_editor")).structuredContent;
    await page.goto(pairing.url);
    await expect(
      page.getByRole("dialog", { name: "Connect AI agent" }),
    ).toBeVisible();
    expect(page.url()).not.toContain("token=");
    expect((await tool("connect_editor")).structuredContent.connected).toBe(
      false,
    );
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    expect((await tool("connect_editor")).structuredContent.connected).toBe(
      false,
    );
    // Pasting the link into the existing editor tab must also offer pairing.
    await page.goto(pairing.url);
    await page.getByRole("button", { name: "Connect", exact: true }).click();
    await expect
      .poll(
        async () => (await tool("connect_editor")).structuredContent.connected,
      )
      .toBe(true);
    const before = (await tool("inspect_project")).structuredContent.project;
    await tool("apply_edits", {
      expectedRevision: before.revision,
      idempotencyKey: "https-rename",
      operations: [{ op: "project", patch: { name: "Paired hosted editor" } }],
    });
    await expect(
      page.getByLabel("Project menu", { exact: true }),
    ).toContainText("Paired hosted editor");
    await tool("manage_assets", {
      action: "import",
      paths: [resolve("public/demo/dusk.mp4")],
    });
    const state = (await tool("inspect_project")).structuredContent;
    expect(state.missingAssets).toEqual([]);
    await tool("manage_assets", {
      action: "place",
      assetId: state.project.assets[0].id,
      start: 0,
    });
    await expect(
      page.getByRole("button", {
        name: "Select segment dusk.mp4",
        exact: true,
      }),
    ).toHaveCount(1);
    const preview = await tool("preview_frame", { time: 1 });
    expect(preview.content[0].type).toBe("image");
    expect(preview.content[0].data.length).toBeGreaterThan(1000);
    const job = (
      await tool("export_video", {
        settings: {
          width: 320,
          height: 180,
          fps: 15,
          bitrate: 500000,
          audio: false,
        },
      })
    ).structuredContent;
    await expect
      .poll(
        async () =>
          (await tool("manage_jobs", { jobId: job.jobId })).structuredContent
            .status,
        { timeout: 60000 },
      )
      .toBe("complete");
    await page.getByRole("button", { name: "Export", exact: true }).click();
    await expect(
      page.getByRole("link", { name: "Download video", exact: true }),
    ).toBeVisible();
  } finally {
    child.kill();
  }
});
