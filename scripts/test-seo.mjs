import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { site, searchPages, searchMetadata } from "../seo.config.ts";

for (const [page, definition] of Object.entries(searchPages)) {
  const html = await readFile(
    resolve("dist", definition.path, "index.html"),
    "utf8",
  );
  const metadata = searchMetadata(page);
  assert.equal(
    (html.match(/<title>/g) || []).length,
    1,
    `${page}: duplicate title`,
  );
  assert.equal(
    (html.match(/rel="canonical"/g) || []).length,
    1,
    `${page}: duplicate canonical`,
  );
  assert.ok(
    html.includes(`href="${metadata.canonical}"`),
    `${page}: incorrect canonical`,
  );
  assert.equal(
    (html.match(/name="description"/g) || []).length,
    1,
    `${page}: duplicate description`,
  );
  assert.ok(html.includes("max-image-preview:large"));
  assert.ok(html.includes(`content="${site.image}"`));
  // Valid HTML can still have conflicting social tags; Lighthouse does not catch them.
  const fields = new Map();
  for (const tag of html.match(/<meta\b[^>]*>/g) || []) {
    const key = tag.match(/(?:name|property)="([^"]+)"/)?.[1];
    if (!key || !(key.startsWith("og:") || key.startsWith("twitter:")))
      continue;
    assert.ok(!fields.has(key), `${page}: duplicate social metadata ${key}`);
    fields.set(key, tag.match(/content="([^"]*)"/)?.[1]);
  }
  for (const key of [
    "og:title",
    "og:description",
    "og:url",
    "og:image",
    "og:image:width",
    "og:image:height",
    "og:image:alt",
    "twitter:title",
    "twitter:description",
    "twitter:image",
    "twitter:image:alt",
    "twitter:card",
  ]) {
    assert.ok(fields.get(key), `${page}: missing social metadata ${key}`);
  }
  const body = html.slice(html.indexOf("<body"));
  assert.ok(
    body.includes("<main"),
    `${page}: content must exist before JavaScript`,
  );
  assert.equal(
    (body.match(/<h1\b/g) || []).length,
    1,
    `${page}: expected one public H1`,
  );
  assert.ok(
    !body.includes('<div id="root"></div>'),
    `${page}: empty app shell`,
  );
  assert.ok(
    body.includes(
      page === "landing"
        ? "Free online video editor."
        : "MCP video editor setup and tool reference.",
    ),
  );
  const json = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  );
  assert.ok(json, `${page}: missing structured data`);
  const schema = JSON.parse(json[1]);
  const app = schema["@graph"].find(
    (item) => item["@type"] === "WebApplication",
  );
  assert.equal(app.offers.price, "0");
  assert.equal(app.isAccessibleForFree, true);
  assert.equal(
    app.aggregateRating,
    undefined,
    "Do not publish invented ratings",
  );
  assert.equal(
    schema["@graph"].find(
      (item) => item["@id"] === `${metadata.canonical}#page`,
    ).url,
    metadata.canonical,
  );
  if (page === "docs") {
    const article = schema["@graph"].find(
      (item) => item["@type"] === "TechArticle",
    );
    assert.equal(article.author.name, site.author.name);
    assert.equal(article.author.url, site.author.url);
    assert.equal(article.image, site.image);
    const readableBody = body.replace(/<!--[\s\S]*?-->/g, "");
    assert.ok(readableBody.includes(`Maintained by ${site.author.name}`));
  }
}
const sitemap = await readFile("dist/sitemap.xml", "utf8");
const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(
  (match) => match[1],
);
assert.deepEqual(
  locations,
  Object.values(searchPages).map((page) => new URL(page.path, site.url).href),
);
assert.ok(
  locations.every((url) => !url.includes("#") && !url.endsWith("index.html")),
);
console.log(
  "SEO: public HTML, unique metadata, canonical URLs, truthful structured data and sitemap passed.",
);
