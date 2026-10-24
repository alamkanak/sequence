import { createServer } from "vite";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { site, searchPages } from "../seo.config.ts";

const base = process.env.BASE_PATH || "./";
const vite = await createServer({
  base: base === "./" ? "/" : base,
  server: { middlewareMode: true, watch: null, hmr: false },
  appType: "custom",
});
try {
  const { render } = await vite.ssrLoadModule("/src/prerender.tsx");
  for (const [page, { path }] of Object.entries(searchPages)) {
    const file = resolve("dist", path, "index.html");
    let markup = render(page);
    if (base === "./") {
      const prefix = page === "docs" ? "../../" : "./";
      markup = markup.replace(/\b(src|href)="\/(?!\/)/g, `$1="${prefix}`);
    }
    const html = await readFile(file, "utf8");
    if (!html.includes('<div id="root"></div>'))
      throw new Error(`Missing prerender outlet in ${file}`);
    await writeFile(
      file,
      html.replace(
        '<div id="root"></div>',
        () => `<div id="root">${markup}</div>`,
      ),
    );
  }
  // Hash routes represent local workspace state, not additional public documents.
  const urls = Object.values(searchPages).map(
    ({ path }) => `<url><loc>${new URL(path, site.url).href}</loc></url>`,
  );
  await writeFile(
    resolve("dist/sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`,
  );
  console.log(
    "Prerendered landing and MCP docs; generated the canonical sitemap.",
  );
} finally {
  await vite.close();
}
