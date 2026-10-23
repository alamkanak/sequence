import { readdir, readFile } from "node:fs/promises";
import assert from "node:assert/strict";
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) await walk(path);
    else if (/\.(tsx?|css)$/.test(path)) {
      const source = await readFile(path, "utf8");
      if (path.endsWith(".css"))
        assert.match(
          source.trim(),
          /^@import "tailwindcss";$/,
          "Only the Tailwind build import is allowed",
        );
      assert.ok(
        !/\bstyle\s*=|<svg\b|<path\b/.test(source),
        `Custom CSS/SVG detected in ${path}`,
      );
      assert.ok(
        !/(lucide|react-icons|heroicons)/.test(source),
        `Non-Phosphor icons in ${path}`,
      );
    }
  }
}
await walk("src");
console.log(
  "UI constraints passed: Tailwind-only styling, no inline styles/custom SVG, Phosphor-only icons.",
);
