import { test, expect } from "@playwright/test";
import { extname, resolve } from "node:path";

test("published landing and MCP setup remain readable without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 1000 },
  });
  const origin = "https://sequence-seo.test";
  await context.route(`${origin}/**`, async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    expect(pathname).toMatch(/^\/sequence\//);
    const relative = pathname.slice("/sequence/".length);
    const types: Record<string, string> = {
      ".html": "text/html",
      ".css": "text/css",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".json": "application/json",
    };
    const file = resolve(
      "dist",
      !relative || relative.endsWith("/") ? `${relative}index.html` : relative,
    );
    await route.fulfill({
      path: file,
      contentType: types[extname(file)] || "application/octet-stream",
    });
  });
  try {
    const page = await context.newPage();
    await page.goto(`${origin}/sequence/`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Free online video editor.No watermark.",
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://alamkanak.github.io/sequence/",
    );
    await page
      .getByText("Is Sequence a free online video editor with no watermark?", {
        exact: true,
      })
      .click();
    await expect(
      page.getByText(
        /Optional AI clients and their providers may have their own/,
      ),
    ).toBeVisible();
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Docs", exact: true })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "MCP video editor setup and tool reference.",
    );
    await expect(
      page.getByRole("heading", { name: "1. Add Sequence to your AI app" }),
    ).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://alamkanak.github.io/sequence/docs/mcp/",
    );
  } finally {
    await context.close();
  }
});
