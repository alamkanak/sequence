import { test, expect } from "@playwright/test";
import { resolve } from "node:path";
test("local import → tracks → split/speed → elements → export/download", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#/editor");
  await page
    .getByLabel("Import media files", { exact: true })
    .setInputFiles(
      ["dusk.mp4", "coast.mp4", "ambient.wav"].map((n) =>
        resolve("public/demo", n),
      ),
    );
  await expect(
    page.getByText("ambient.wav", { exact: true }).first(),
  ).toBeVisible({ timeout: 30000 });
  await page
    .getByRole("button", { name: "Add dusk.mp4 to timeline", exact: true })
    .click({ force: true });
  await page
    .getByRole("button", { name: "Add coast.mp4 to timeline", exact: true })
    .click({ force: true });
  await page
    .getByRole("button", { name: "Add ambient.wav to timeline", exact: true })
    .click({ force: true });
  const timeline = page.getByTestId("timeline-canvas");
  const box = (await timeline.boundingBox())!;
  await page.mouse.click(box.x + 3 * 65, box.y + 12);
  await page.mouse.click(box.x + 3 * 65, box.y + 26 + 64 + 20);
  await page
    .getByRole("button", { name: "Split at playhead (S)", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Select segment dusk.mp4", exact: true }),
  ).toHaveCount(2);
  await page.mouse.click(box.x + 65, box.y + 26 + 64 + 20);
  await page.getByLabel("Speed", { exact: true }).fill("1.5");
  await page.getByLabel("Speed", { exact: true }).press("Tab");
  await expect(page.getByLabel("Speed", { exact: true })).toHaveValue("1.5");
  await page.getByRole("button", { name: "Elements", exact: true }).click();
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page
    .getByLabel("Text content", { exact: true })
    .fill("A story made locally");
  await page.getByRole("combobox", { name: "Enter", exact: true }).click();
  await page.getByRole("option", { name: "Fade", exact: true }).click();
  await page.getByRole("combobox", { name: "Exit", exact: true }).click();
  await page
    .getByRole("option", { name: "Slide horizontally", exact: true })
    .click();
  await page.getByRole("button", { name: "Rectangle", exact: true }).click();
  await page.getByLabel("Opacity (%)", { exact: true }).fill("35");
  await page.getByLabel("Opacity (%)", { exact: true }).press("Tab");
  // Switching selection must never apply a previous inspector's draft geometry.
  await page.getByLabel("Width (%)", { exact: true }).fill("35");
  await page.getByLabel("Width (%)", { exact: true }).press("Tab");
  await page.mouse.click(box.x + 7 * 65, box.y + 26 + 64 + 20);
  await expect(page.getByLabel("Segment name", { exact: true })).toHaveValue(
    "coast.mp4",
  );
  await page.getByLabel("Width (%)", { exact: true }).press("Tab");
  await expect(page.getByLabel("Width (%)", { exact: true })).toHaveValue(
    "100",
  );
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByRole("button", { name: "Export video", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Download video", exact: true }),
  ).toBeVisible({ timeout: 60000 });
  await expect(page.getByTestId("exported-video")).toHaveJSProperty(
    "videoWidth",
    960,
  );
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Download video", exact: true }).click(),
  ]);
  await download.saveAs(testInfo.outputPath("workflow.mp4"));
  expect(errors).toEqual([]);
});
test("appearance follows system until an explicit persistent override", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByLabel("Light appearance", { exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByLabel("System appearance", { exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
