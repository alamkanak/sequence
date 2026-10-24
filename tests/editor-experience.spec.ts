import { test, expect, type Page } from "@playwright/test";

async function command(page: Page, query: string) {
  await expect(
    page.getByRole("button", { name: "Commands", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("ControlOrMeta+k");
  const search = page.getByRole("combobox", { name: "Search commands" });
  await expect(search).toBeFocused();
  await search.fill(query);
  return search;
}

async function pasteImage(page: Page, target = "body") {
  await page.evaluate(async (selector) => {
    const blob = await (await fetch("/demo/coast.jpg")).blob();
    const data = new DataTransfer();
    data.items.add(
      new File([blob], "Pasted coast.jpg", { type: "image/jpeg" }),
    );
    document.querySelector(selector)!.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    );
  }, target);
}

for (const theme of ["light", "dark"] as const) {
  test(`media add button gains emphasis on hover in ${theme}`, async ({
    page,
  }, info) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto("/#/editor");
    await page
      .getByLabel("Import media files", { exact: true })
      .setInputFiles("public/demo/coast.jpg");
    const add = page.getByRole("button", {
      name: "Add coast.jpg to timeline",
      exact: true,
    });
    await expect(add).toHaveCSS("opacity", "1");
    await expect(add).toHaveCSS("color", "rgb(255, 255, 255)");
    await add.hover();
    await expect(add).toHaveCSS(
      "background-color",
      "oklch(0.511 0.262 276.966)",
    );
    await expect(add).toHaveCSS("color", "rgb(255, 255, 255)");
    await page.screenshot({
      path: info.outputPath(`media-hover-${theme}.png`),
    });
    await add.click();
    await expect(
      page.getByRole("button", {
        name: "Select segment coast.jpg",
        exact: true,
      }),
    ).toHaveCount(1);
  });

  test(`color picker previews live without covering the canvas in ${theme}`, async ({
    page,
  }, info) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto("/#/editor");
    const field = page.getByLabel("Canvas color hex", { exact: true });
    const original = await field.inputValue();
    const swatch = page.getByRole("button", {
      name: "Canvas color",
      exact: true,
    });
    await swatch.click();
    const dialog = page.getByRole("dialog", { name: "Choose canvas color" });
    const hex = dialog.getByLabel("Picker hex");
    await hex.fill("ff5533");
    await hex.press("Tab");
    await expect(dialog.getByLabel("Picker red")).toHaveValue("255");
    await expect(dialog.getByLabel("Picker green")).toHaveValue("85");
    await expect(field).toHaveValue("ff5533");
    await expect(dialog).toHaveAttribute("aria-modal", "false");
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const { transport } = await import("/src/engine/transport.ts");
          return transport.engine?.project?.background;
        }),
      )
      .toBe("#ff5533");
    const canvas = page.getByLabel("Preview transform handles", {
      exact: true,
    });
    expect(
      await canvas.evaluate((node) => {
        const box = node.getBoundingClientRect();
        return (
          document.elementFromPoint(
            box.left + box.width / 2,
            box.top + box.height / 2,
          ) === node
        );
      }),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`color-picker-${theme}.png`),
    });
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(field).toHaveValue(original);
    await expect(swatch).toBeFocused();
    await swatch.click();
    await dialog.getByLabel("Picker red").fill("255");
    await dialog.getByLabel("Picker red").press("Tab");
    await hex.fill("336699");
    await dialog
      .getByRole("button", { name: "Apply color", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    await expect(field).toHaveValue("336699");
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(field).toHaveValue(original);
    await swatch.click();
    await dialog.getByLabel("Picker red").fill("5");
    await dialog.getByLabel("Picker red").press("Escape");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });
}

test("import offers a choice, browse supports batches, and paste works with the dialog closed", async ({
  page,
}) => {
  await page.goto("/#/editor");
  await page
    .getByRole("button", { name: "Import media", exact: false })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Import media",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Paste from clipboard", exact: true }),
  ).toBeVisible();
  const chooser = page.waitForEvent("filechooser");
  await dialog
    .getByRole("button", { name: "Browse files", exact: true })
    .click();
  await (
    await chooser
  ).setFiles(["public/demo/dusk.mp4", "public/demo/ambient.wav"]);
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("group", { name: /^Media / })).toHaveCount(2);
  await page.locator("body").click({ position: { x: 5, y: 60 } });
  await pasteImage(page);
  await expect(page.getByRole("group", { name: /^Media / })).toHaveCount(3);
  await expect(
    page.getByRole("group", { name: "Media Pasted coast.jpg", exact: true }),
  ).toBeVisible();
});

test("clipboard read imports one image and denied permission offers keyboard paste", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/#/editor");
  await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 32;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ff5533";
    ctx.fillRect(0, 0, 32, 32);
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((blob) => resolve(blob!)),
    );
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
  });
  await (await command(page, "paste media from clipboard")).press("Enter");
  let dialog = page.getByRole("dialog", { name: "Import media", exact: true });
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("group", { name: /^Media Clipboard / }),
  ).toHaveCount(1);
  await page.evaluate(() => {
    Object.defineProperty(navigator.clipboard, "read", {
      configurable: true,
      value: async () => {
        throw new DOMException("Denied", "NotAllowedError");
      },
    });
  });
  await expect(
    page.getByRole("button", { name: "Import media", exact: false }),
  ).toBeVisible();
  await page.keyboard.press("ControlOrMeta+i");
  dialog = page.getByRole("dialog", { name: "Import media", exact: true });
  await dialog
    .getByRole("button", { name: "Paste from clipboard", exact: true })
    .click();
  await expect(dialog.getByRole("status")).toContainText("Press ⌘V / Ctrl+V");
  await pasteImage(page, '[role="dialog"] button');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("group", { name: /^Media / })).toHaveCount(2);
});

test("media paste takes precedence over a copied segment and typing keeps native paste", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/#/editor");
  await (await command(page, "add rectangle")).press("Enter");
  const segment = page.getByRole("button", { name: /^Select segment / });
  await expect(segment).toHaveCount(1);
  await segment.focus();
  await page.keyboard.press("ControlOrMeta+c");
  await page.keyboard.press("ControlOrMeta+v");
  await expect(segment).toHaveCount(2);
  await pasteImage(page);
  await expect(
    page.getByRole("group", { name: "Media Pasted coast.jpg", exact: true }),
  ).toHaveCount(1);
  await expect(segment).toHaveCount(2);
  await page.getByRole("button", { name: "Media", exact: true }).click();
  const search = page.getByLabel("Search media", { exact: true });
  await search.focus();
  await page.evaluate(() =>
    navigator.clipboard.writeText("hello from clipboard"),
  );
  await page.keyboard.press("ControlOrMeta+v");
  await expect(search).toHaveValue("hello from clipboard");
  await expect(segment).toHaveCount(2);
});

test("commands support search, keyboard navigation, unavailable actions, and contextual settings", async ({
  page,
}, info) => {
  await page.goto("/#/editor");
  let search = await command(page, "copy selected");
  await expect(
    page.getByRole("option", { name: /Copy selected segment/ }),
  ).toHaveAttribute("aria-disabled", "true");
  await search.press("Enter");
  await expect(search).toBeVisible();
  await search.fill("nothing matches this");
  await expect(
    page.getByText("No commands found.", { exact: false }),
  ).toBeVisible();
  await search.fill("add rectangle");
  await search.press("Enter");
  await expect(
    page.getByRole("dialog", { name: "Commands", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Segment name", { exact: true })).toBeVisible();
  search = await command(page, "rotation");
  await search.press("Enter");
  await expect(page.getByLabel("Rotation (°)", { exact: true })).toBeFocused();
  await page.getByLabel("Rotation (°)", { exact: true }).fill("45");
  await page.keyboard.press("Enter");
  search = await command(page, "track");
  await page.screenshot({ path: info.outputPath("commands-tracks.png") });
  await expect(
    page.getByRole("option", { name: /Add video track/ }),
  ).toBeVisible();
  await search.press("ArrowDown");
  await expect(page.getByRole("option").nth(1)).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await search.fill("add audio track");
  await search.press("Enter");
  await expect(page.getByLabel("Track name 4", { exact: true })).toBeVisible();
  search = await command(page, "export");
  await search.press("Enter");
  await expect(
    page.getByRole("dialog", { name: "Export your video", exact: true }),
  ).toBeVisible();
  search = await command(page, "format");
  await search.press("Enter");
  await expect(
    page.getByRole("listbox", { name: "Format", exact: true }),
  ).toBeVisible();
});

test("import dialog owns file drops, reports unsupported paste, and command media actions reveal filtered assets", async ({
  page,
}) => {
  await page.goto("/#/editor");
  await expect(
    page.getByRole("button", { name: "Commands", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("ControlOrMeta+i");
  const dialog = page.getByRole("dialog", {
    name: "Import media",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("button", { name: "Close dialog" })
    .evaluate((button) => {
      const data = new DataTransfer();
      data.setData("text/plain", "not media");
      button.dispatchEvent(
        new ClipboardEvent("paste", {
          clipboardData: data,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
  await expect(dialog.getByRole("status")).toContainText("No media found");
  await dialog
    .getByText("Drop files here", { exact: true })
    .evaluate(async (target) => {
      const blob = await (await fetch("/demo/coast.jpg")).blob();
      const data = new DataTransfer();
      data.items.add(
        new File([blob], "Dropped coast.jpg", { type: "image/jpeg" }),
      );
      target.dispatchEvent(
        new DragEvent("drop", {
          dataTransfer: data,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("group", { name: /^Media / })).toHaveCount(1);
  await page.getByLabel("Search media", { exact: true }).fill("no match");
  const search = await command(page, "media actions dropped");
  await search.press("Enter");
  await expect(
    page.getByRole("menu", {
      name: "Actions for Dropped coast.jpg",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("menuitem", { name: "Remove media", exact: true })
    .click();
  await expect(page.getByRole("group", { name: /^Media / })).toHaveCount(0);
});

test("element colors preview live in the inspector, cancel restores them, and outside click commits once", async ({
  page,
}, info) => {
  await page.goto("/#/editor");
  await (await command(page, "add rectangle")).press("Enter");
  const swatch = page.getByRole("button", { name: "Fill color", exact: true });
  const field = page.getByLabel("Fill color hex", { exact: true });
  const original = await field.inputValue();
  await swatch.click();
  let picker = page.getByRole("dialog", { name: "Choose color", exact: true });
  await picker.getByLabel("Picker hex").fill("22cc88");
  await expect(field).toHaveValue("22cc88");
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const { transport } = await import("/src/engine/transport.ts");
        return transport.engine?.project?.clips.find(
          (clip) => clip.kind === "shape",
        )?.fill;
      }),
    )
    .toBe("#22cc88");
  await page.screenshot({ path: info.outputPath("live-element-color.png") });
  await picker.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(field).toHaveValue(original);
  // Cancel must not consume the element-creation undo step.
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /^Select segment / }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await swatch.click();
  picker = page.getByRole("dialog", { name: "Choose color", exact: true });
  await picker.getByLabel("Picker hex").fill("336699");
  await picker.getByLabel("Picker hex").fill("cc5500");
  await page.getByRole("button", { name: "Snapping", exact: true }).click();
  await expect(picker).toHaveCount(0);
  await expect(field).toHaveValue("cc5500");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(field).toHaveValue(original);
});
