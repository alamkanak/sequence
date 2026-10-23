import { test, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
test("500 segments, eight tracks, two 1080p sources, music and animated elements", async ({
  page,
}, testInfo) => {
  await page.goto("/#/editor");
  await page
    .getByRole("button", { name: "Performance lab", exact: true })
    .click();
  page.on("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Load 1080p stress project", exact: true })
    .click();
  await expect(page.getByLabel("Project name", { exact: true })).toHaveValue(
    "Benchmark · 500 segments / 1080p",
    { timeout: 30000 },
  );
  await page
    .getByRole("button", { name: "Run 10s playback benchmark", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Run 10s playback benchmark",
      exact: true,
    }),
  ).toBeEnabled({ timeout: 20000 });
  await page.getByText("Benchmark JSON", { exact: true }).click();
  const report = JSON.parse(
    await page
      .getByLabel("Benchmark report JSON", { exact: true })
      .inputValue(),
  );
  await writeFile(
    testInfo.outputPath("benchmark.json"),
    JSON.stringify(report, null, 2),
  );
  await testInfo.attach("benchmark", {
    body: JSON.stringify(report, null, 2),
    contentType: "application/json",
  });
  expect(report.project.clips).toBe(500);
  expect(report.metrics.renders).toBeGreaterThan(240);
  expect(report.metrics.longTasks).toBeLessThan(5);
  if (process.env.PERFORMANCE_GATE === "1") {
    expect(report.metrics.uiFps).toBeGreaterThanOrEqual(58);
    expect(report.metrics.p95FrameMs).toBeLessThanOrEqual(20);
  }
});
