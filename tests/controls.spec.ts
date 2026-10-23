import { test, expect } from "@playwright/test";

test("custom selects update project settings and support keyboard selection", async ({
  page,
}) => {
  await page.goto("/#/editor");
  const aspect = page.getByRole("combobox", {
    name: "Aspect ratio",
    exact: true,
  });
  await aspect.click();
  await expect(
    page.getByRole("listbox", { name: "Aspect ratio" }),
  ).toBeVisible();
  await page.getByRole("option", { name: "1:1 · Square", exact: true }).click();
  await expect(page.getByLabel("Height", { exact: true })).toHaveValue("1920");
  await expect(aspect).toBeFocused();

  const quality = page.getByRole("combobox", {
    name: "Preview quality",
    exact: true,
  });
  await quality.focus();
  await quality.press("ArrowDown");
  await page
    .getByRole("option", { name: "Full quality", exact: true })
    .press("ArrowDown");
  await page
    .getByRole("option", { name: "Half quality", exact: true })
    .press("Enter");
  await expect(quality).toHaveText("Half quality");
  await expect(quality).toBeFocused();
  await quality.click();
  await page.getByRole("listbox").press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(quality).toBeFocused();
});

test("dropdowns escape scrolling panels and Escape closes only the menu in a dialog", async ({
  page,
}) => {
  await page.goto("/#/editor");
  await page.getByRole("button", { name: "Elements", exact: true }).click();
  await page.getByRole("button", { name: "Rectangle", exact: true }).click();
  const enter = page.getByRole("combobox", { name: "Enter", exact: true });
  await enter.scrollIntoViewIfNeeded();
  await enter.click();
  await page
    .getByRole("option", { name: "Slide horizontally", exact: true })
    .click();
  await expect(enter).toHaveText("Slide horizontally");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Export your video" });
  const format = page.getByRole("combobox", { name: "Format", exact: true });
  await format.click();
  await page
    .getByRole("option", { name: "MP4 · H.264 + AAC", exact: true })
    .press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await expect(format).toBeFocused();
  await format.click();
  await page
    .getByRole("option", { name: "WebM · VP9 + Opus", exact: true })
    .click();
  await expect(format).toHaveText("WebM · VP9 + Opus");
  await expect(format).toBeFocused();
  await format.press("Tab");
  await expect(
    dialog.getByRole("combobox", { name: "Resolution" }),
  ).toBeFocused();
});

test("number drafts commit, clamp, cancel, and retain keyboard stepping without system spinners", async ({
  page,
}) => {
  await page.goto("/#/editor");
  const fps = page.getByLabel("Frame rate", { exact: true });
  await fps.fill("48");
  await fps.press("Enter");
  await expect(fps).toHaveValue("48");
  await fps.fill("999");
  await fps.press("Tab");
  await expect(fps).toHaveValue("120");
  await fps.fill("999");
  await fps.press("Tab");
  await expect(fps).toHaveValue("120");
  await fps.fill("24");
  await fps.press("Escape");
  await expect(fps).toHaveValue("120");
  await fps.focus();
  await fps.press("ArrowDown");
  await fps.press("Tab");
  await expect(fps).toHaveValue("119");
  await fps.fill("");
  await fps.press("Tab");
  await expect(fps).toHaveValue("119");
  await expect(fps).toHaveCSS("appearance", "textfield");
});

test("compact color fields validate hex, support cancellation, and share the selected color", async ({
  page,
}) => {
  await page.goto("/#/editor");
  const hex = page.getByLabel("Canvas color hex", { exact: true });
  const picker = page.getByLabel("Canvas color", { exact: true });
  await hex.fill("#FF5533");
  await hex.press("Enter");
  await expect(hex).toHaveValue("ff5533");
  await expect(picker).toHaveValue("#ff5533");
  await hex.fill("zzzzzz");
  await hex.press("Tab");
  await expect(hex).toHaveValue("ff5533");
  await hex.fill("112233");
  await hex.press("Escape");
  await expect(hex).toHaveValue("ff5533");
  await expect(picker).toHaveValue("#ff5533");
  expect((await picker.boundingBox())!.width).toBeLessThanOrEqual(24);
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const { get } = await import("/src/core/storage.ts");
        return (await get("projects", "last"))?.background;
      }),
    )
    .toBe("#ff5533");
  await page.reload();
  await expect(hex).toHaveValue("ff5533");
});

for (const theme of ["light", "dark"] as const) {
  test(`controls and paint menus fit narrow panels in ${theme} appearance`, async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/#/editor");
    await page
      .getByRole("combobox", { name: "Aspect ratio", exact: true })
      .click();
    const menu = page.getByRole("listbox");
    const box = (await menu.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(1024);
    expect(box.y + box.height).toBeLessThanOrEqual(768);
    await page.screenshot({
      path: testInfo.outputPath(`controls-${theme}.png`),
    });
    await menu.press("Escape");
    await page.getByRole("button", { name: "Elements", exact: true }).click();
    await page.getByRole("button", { name: "Rectangle", exact: true }).click();
    await page
      .getByRole("combobox", { name: "Fill style", exact: true })
      .click();
    await page
      .getByRole("option", { name: "Linear gradient", exact: true })
      .click();
    await expect(
      page.getByLabel("Fill stop 1 color hex", { exact: true }),
    ).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`paint-${theme}.png`) });
  });
}
