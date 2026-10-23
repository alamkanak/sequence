import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

test.use({ channel: process.env.PLAYWRIGHT_CHROMIUM_CHANNEL });

async function missingProject(page: Page, names = ["dusk.mp4"]) {
  await page.goto("/#/editor");
  await page
    .getByLabel("Import media files", { exact: true })
    .setInputFiles(names.map((name) => resolve("public/demo", name)));
  for (const name of names) {
    await expect(
      page.getByRole("group", { name: `Media ${name}`, exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: `Add ${name} to timeline`, exact: true })
      .click({ force: true });
  }
  const saved = await page.evaluate(async () => {
    const { store } = await import("/src/core/store.ts");
    const { saveProject } = await import("/src/core/storage.ts");
    const p = structuredClone(store.get().project);
    Object.assign(p.clips[0], {
      in: 0.5,
      duration: 1.5,
      speed: 1.5,
      volume: 0.6,
    });
    store.replace(p);
    await saveProject(p);
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("sequence-v1", 1);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("files", "readwrite");
        tx.objectStore("files").clear();
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });
    return p;
  });
  await page.reload();
  for (const name of names)
    await expect(
      page.getByRole("button", { name: `Relink ${name}`, exact: true }),
    ).toBeVisible();
  return saved;
}

async function project(page: Page) {
  return page.evaluate(
    async () => (await import("/src/core/store.ts")).store.get().project,
  );
}

async function assertPreview(page: Page) {
  const frame = await page.evaluate(async () => {
    const { transport } = await import("/src/engine/transport.ts");
    const { meter } = await import("/src/core/performance.ts");
    const engine = transport.engine!;
    while (engine.busy) await new Promise((resolve) => setTimeout(resolve, 10));
    await engine.draw(0.5, true);
    return {
      decoded: meter.decoded,
      frame: engine.lastDraw,
      fps: engine.project!.fps,
    };
  });
  expect(frame.decoded).toBeGreaterThan(0);
  expect(frame.frame).toBe(Math.floor(0.5 * frame.fps));
}

test("reimporting missing media refreshes the card and preview without changing edits", async ({
  page,
}) => {
  const saved = await missingProject(page);
  await page
    .getByLabel("Import media files", { exact: true })
    .setInputFiles(resolve("public/demo/dusk.mp4"));
  await expect(page.getByText("File missing", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Add dusk.mp4 to timeline", exact: true }),
  ).toBeEnabled();
  const restored = await project(page);
  expect(restored.assets).toEqual(saved.assets);
  expect(restored.clips).toEqual(saved.clips);
  await assertPreview(page);
});

test("the direct relink picker accepts renamed media and persists it across reloads", async ({
  page,
}) => {
  const saved = await missingProject(page);
  await page.screenshot({ path: test.info().outputPath("missing-media.png") });
  const chooserPromise = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Relink dusk.mp4", exact: true })
    .click();
  const chooser = await chooserPromise;
  expect(chooser.isMultiple()).toBe(false);
  await chooser.setFiles({
    name: "moved-and-renamed.mp4",
    mimeType: "video/mp4",
    buffer: await readFile(resolve("public/demo/dusk.mp4")),
  });
  await expect(page.getByRole("status")).toContainText("Relinked dusk.mp4");
  await expect(page.getByText("File missing", { exact: true })).toHaveCount(0);
  const restored = await project(page);
  expect(restored.assets[0].id).toBe(saved.assets[0].id);
  expect(restored.assets[0].name).toBe("moved-and-renamed.mp4");
  expect(restored.clips).toEqual(saved.clips);
  await assertPreview(page);
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(
    page.getByRole("group", {
      name: "Media moved-and-renamed.mp4",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText("File missing", { exact: true })).toHaveCount(0);
  await assertPreview(page);
});

test("bulk relink restores all matching files and leaves unmatched media recoverable", async ({
  page,
}) => {
  const saved = await missingProject(page, ["dusk.mp4", "coast.mp4"]);
  const pickerPromise = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Relink files…", exact: true })
    .click();
  const picker = await pickerPromise;
  expect(picker.isMultiple()).toBe(true);
  await picker.setFiles([
    resolve("public/demo/dusk.mp4"),
    resolve("public/demo/ambient.wav"),
  ]);
  await expect(page.getByRole("status")).toContainText("Relinked 1 file.");
  await expect(page.getByRole("status")).toContainText("ambient.wav");
  await expect(
    page.getByRole("button", { name: "Relink coast.mp4", exact: true }),
  ).toBeVisible();
  expect((await project(page)).assets).toHaveLength(2);
  await page
    .getByRole("button", { name: "Relink files…", exact: true })
    .click();
  await page
    .getByLabel("Relink missing media files", { exact: true })
    .setInputFiles(resolve("public/demo/coast.mp4"));
  await expect(page.getByText("File missing", { exact: true })).toHaveCount(0);
  expect((await project(page)).clips).toEqual(saved.clips);
  await assertPreview(page);
});
