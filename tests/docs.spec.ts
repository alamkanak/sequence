import { test, expect } from "@playwright/test";
import { extname, resolve } from "node:path";
import { mcpClients } from "../src/docs/client-configs";

test("client setup tabs show the right file, source, and scoped configuration", async ({
  page,
}) => {
  await page.goto("/docs/mcp/");
  await expect(
    page.getByRole("tab", { name: "Codex", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  const panel = page.locator("#client-setup-panel");
  await expect(panel.locator("pre")).toContainText("[mcp_servers.sequence]");
  await panel
    .getByRole("textbox", { name: "Allowed folders" })
    .fill("/Users/test/My Clips\n/Users/test/Music");
  for (const client of mcpClients) {
    await page.getByRole("tab", { name: client.name, exact: true }).click();
    await expect(page).toHaveURL(
      new RegExp(`#getting-started/${client.id}--installation$`),
    );
    await expect(panel.getByRole("heading")).toHaveText(
      `Set up ${client.name}`,
    );
    await expect(
      panel.getByRole("link", { name: "Official setup guide" }),
    ).toHaveAttribute("href", client.source);
    await expect(
      panel.getByRole("button", { name: `Copy ${client.file}`, exact: true }),
    ).toBeVisible();
    await expect(panel.locator("pre")).toContainText("/Users/test/My Clips");
    await expect(panel.locator("pre")).toContainText("/Users/test/Music");
    await expect(panel.locator("pre")).toContainText('"--allow-media"');
  }
  await page.reload();
  await expect(
    page.getByRole("tab", { name: "Claude Desktop", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(panel.getByRole("heading")).toHaveText("Set up Claude Desktop");
});

test("media access and Windows settings change the configuration that is copied", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/docs/mcp/");
  const panel = page.locator("#client-setup-panel");
  const code = panel.locator("pre");
  const copy = panel.getByRole("button", {
    name: "Copy .codex/config.toml",
    exact: true,
  });
  await panel
    .getByRole("textbox", { name: "Allowed folders" })
    .fill("/Users/test/My Clips");
  await copy.click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    await code.textContent(),
  );
  await expect(copy).toHaveText("Copied");
  await panel.getByRole("radio", { name: /^Any directory/ }).check();
  await expect(code).toContainText('"--allow-media-anywhere"');
  await expect(code).not.toContainText('"--allow-media"');
  await expect(code).not.toContainText("/Users/test/My Clips");
  await expect(copy).toHaveText("Copy");
  await copy.click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    await code.textContent(),
  );
  await panel.getByRole("radio", { name: /^Browser imports only/ }).check();
  await expect(code).not.toContainText("--allow-media");
  await panel.getByRole("radio", { name: /^Specific folders/ }).check();
  await expect(code).toContainText("/Users/test/My Clips");
  await panel
    .getByRole("combobox", { name: "Operating system" })
    .selectOption("windows");
  await panel
    .getByRole("textbox", { name: "Allowed folders" })
    .fill("C:\\Users\\test\\My Videos");
  await expect(code).toContainText('command = "cmd"');
  await expect(code).toContainText('"/c"');
  await expect(code).toContainText('"C:\\\\Users\\\\test\\\\My Videos"');
  await page.getByRole("tab", { name: "OpenCode", exact: true }).click();
  await expect(code).toContainText('"mcp"');
  const config = JSON.parse((await code.textContent())!);
  expect(config.mcp.sequence.command.slice(0, 4)).toEqual([
    "cmd",
    "/c",
    "npx",
    "--yes",
  ]);
  expect(config.mcp.sequence.command.slice(-2)).toEqual([
    "--allow-media",
    "C:\\Users\\test\\My Videos",
  ]);
});

test("setup tabs support keyboard navigation and fit mobile in both themes", async ({
  page,
}, testInfo) => {
  await page.goto("/docs/mcp/#getting-started/codex--installation");
  await page.getByRole("tab", { name: "Codex", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Claude Code", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole("tab", { name: "Claude Code", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(
    page.getByRole("tab", { name: "Claude Desktop", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Home");
  await expect(
    page.getByRole("tab", { name: "Codex", exact: true }),
  ).toBeFocused();
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto("/docs/mcp/#getting-started/codex--installation");
      await expect(page.locator("#client-setup-panel")).toBeVisible();
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      ).toBe(true);
      if (width === 375 || width === 1440) {
        await page.screenshot({
          path: testInfo.outputPath(`setup-${theme}-${width}.png`),
          fullPage: true,
        });
      }
    }
  }
});

test("landing links to the integrated docs and exposes the same MCP definitions", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Docs", exact: true })
    .click();
  await expect(page).toHaveURL(/\/docs\/mcp\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "MCP video editor setup and tool reference.",
  );
  const download = await page.request.get("/docs/mcp/tools.json");
  expect(download.ok()).toBe(true);
  const definitions = await download.json();
  expect(definitions).toHaveLength(7);
  await page
    .getByRole("navigation", { name: "Documentation", exact: true })
    .getByRole("link", { name: "apply_edits", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "apply_edits",
  );
  await expect(
    page.getByText(
      definitions.find((tool: { name: string }) => tool.name === "apply_edits")
        .description,
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Operation", exact: true })
    .selectOption("split");
  await expect(page).toHaveURL(/#apply_edits\/split--operations$/);
  await expect(
    page.getByText(
      "Absolute timeline time in seconds, not source time. Leave at least one project frame on each side.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Operation", exact: true }),
  ).toHaveValue("split");
  await page.getByRole("tab", { name: "JSON Schema", exact: true }).click();
  await expect(page.getByRole("tabpanel")).toContainText(
    '"additionalProperties": false',
  );
  await page
    .getByRole("navigation", { name: "On this page", exact: true })
    .getByRole("link", { name: /^response$/i })
    .click();
  await expect(
    page.getByRole("tab", { name: "Reference", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("heading", { name: "Response", exact: true }),
  ).toBeInViewport();
  expect(errors).toEqual([]);
});

test("built docs and links work under a GitHub Pages project subpath", async ({
  page,
  context,
}) => {
  const origin = "https://sequence-docs.test";
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await context.route(`${origin}/**`, async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    expect(pathname).toMatch(/^\/sequence\//);
    const relative = pathname.replace(/^\/sequence\//, "");
    const file = resolve(
      "dist",
      relative.endsWith("/") || !relative ? `${relative}index.html` : relative,
    );
    const types: Record<string, string> = {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".svg": "image/svg+xml",
      ".json": "application/json",
    };
    await route.fulfill({
      path: file,
      contentType: types[extname(file)] || "application/octet-stream",
    });
  });
  await page.goto(`${origin}/sequence/docs/mcp/#apply_edits/split`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "apply_edits",
  );
  await expect(
    page.getByRole("combobox", { name: "Operation", exact: true }),
  ).toHaveValue("split");
  await expect(page.locator("#examples pre")).toContainText('"op": "split"');
  await page.getByRole("link", { name: "Sequence", exact: true }).click();
  await expect(page).toHaveURL(`${origin}/sequence/`);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Docs", exact: true })
    .click();
  await expect(page).toHaveURL(`${origin}/sequence/docs/mcp/`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "MCP video editor setup and tool reference.",
  );
  expect(errors).toEqual([]);
});

test("docs search covers nested parameters and action variants", async ({
  page,
}) => {
  await page.goto("/docs/mcp/");
  await page.keyboard.press("ControlOrMeta+k");
  await expect(
    page.getByRole("textbox", { name: "Search documentation" }),
  ).toBeFocused();
  await page
    .getByRole("textbox", { name: "Search documentation" })
    .fill("volumeKeyframes");
  await expect(page.getByRole("status")).toContainText("2 tools found");
  await page
    .getByRole("textbox", { name: "Search documentation" })
    .fill("no-such-parameter");
  await expect(page.getByRole("status")).toContainText("0 tools found");
  await page.getByRole("textbox", { name: "Search documentation" }).fill("");
  await page
    .getByRole("navigation", { name: "Documentation", exact: true })
    .getByRole("link", { name: "manage_assets", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Action", exact: true })
    .selectOption("place");
  await expect(page.locator("#parameters")).toContainText("assetId");
  await expect(page.locator("#parameters")).not.toContainText("paths");
  await page
    .getByRole("combobox", { name: "Action", exact: true })
    .selectOption("import");
  await expect(page.locator("#parameters")).toContainText("paths");
  await expect(page.locator("#parameters")).not.toContainText("assetId");
});

test("docs fit desktop and mobile in both themes with working navigation", async ({
  page,
}, testInfo) => {
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto("/docs/mcp/#apply_edits/update_clip");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "apply_edits",
      );
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      ).toBe(true);
      if (width === 375 || width === 1440)
        await page.screenshot({
          path: testInfo.outputPath(`docs-${theme}-${width}.png`),
          fullPage: true,
        });
    }
  }
  await page.setViewportSize({ width: 375, height: 812 });
  const navigation = page.getByRole("navigation", {
    name: "Documentation",
    exact: true,
  });
  await expect(navigation).toBeHidden();
  await page
    .getByRole("button", { name: "Open documentation navigation" })
    .click();
  await expect(navigation).toBeVisible();
  await navigation
    .getByRole("link", { name: "preview_frame", exact: true })
    .click();
  await expect(navigation).toBeHidden();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "preview_frame",
  );
  await page
    .getByRole("button", { name: "Light appearance", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("link", { name: "Sequence", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
