import { test, expect } from "@playwright/test";

test("preview stays on the landing page; the explicit sample action opens a project", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("figure", { name: "Sequence editor preview" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.getByRole("button", { name: "Try sample project" }).click();
  await expect(page).toHaveURL(/#\/editor$/);
  await expect(page.getByLabel("Project menu", { exact: true })).toContainText(
    "A quieter kind of motion",
  );
  await expect(
    page.getByRole("button", { name: "Select segment dusk.mp4", exact: true }),
  ).toHaveCount(1);
});

test("sample failures stay on the landing page with an actionable error", async ({
  page,
}) => {
  await page.route("**/demo/dusk.mp4", (route) =>
    route.fulfill({ status: 503 }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Try sample project" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "The sample couldn’t open",
  );
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("button", { name: "Try sample project" }),
  ).toBeEnabled();
});

test("desktop navigation reaches the right sections and toolbar controls align", async ({
  page,
}) => {
  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  for (const [name, section] of [
    ["Features", "features"],
    ["AI editing", "ai-editing"],
    ["Privacy", "privacy"],
  ]) {
    await navigation.getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`#${section}$`));
    await expect(page.locator(`#${section}`)).toBeInViewport();
  }
  const appearance = await page
    .getByRole("group", { name: "Appearance", exact: true })
    .boundingBox();
  const editor = await page
    .locator("header")
    .getByRole("link", { name: "Open editor" })
    .boundingBox();
  expect(appearance!.height).toBe(editor!.height);
  expect(appearance!.y).toBe(editor!.y);
  const favicon = page.locator('link[rel="icon"]');
  const response = await page.request.get(
    (await favicon.getAttribute("href"))!,
  );
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/svg+xml");
});

test("mobile navigation works with touch and keyboard", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Open navigation" });
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  await expect(navigation).toBeHidden();
  await toggle.click();
  await expect(navigation).toBeVisible();
  await page.getByLabel("Dark appearance", { exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await navigation.getByRole("link", { name: "Privacy", exact: true }).click();
  await expect(page).toHaveURL(/#privacy$/);
  await expect(navigation).toBeHidden();
  await expect(page.locator("#privacy")).toBeInViewport();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await navigation.getByRole("link", { name: "Features", exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(navigation).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeFocused();
});

test("landing fits narrow mobile, tablet, and desktop in both themes", async ({
  page,
}, testInfo) => {
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    for (const width of [320, 375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const dimensions = await page.evaluate(() => ({
        content: document.documentElement.scrollWidth,
        viewport: document.documentElement.clientWidth,
      }));
      expect(dimensions.content, `${theme} at ${width}px`).toBeLessThanOrEqual(
        dimensions.viewport,
      );
      if (width === 375 || width === 1440) {
        await page.screenshot({
          path: testInfo.outputPath(`landing-${theme}-${width}.png`),
          fullPage: true,
        });
      }
    }
  }
});
