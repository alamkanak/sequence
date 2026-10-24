import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import { docsCatalog } from "./companion/docs-catalog.ts";
import { site, searchMetadata } from "./seo.config.ts";
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "sequence-seo",
      transformIndexHtml(_html, context) {
        const metadata = searchMetadata(
          context.path.includes("/docs/mcp/") ? "docs" : "landing",
        );
        const values = [
          ["name", "description", metadata.description],
          ["name", "robots", "index,follow,max-image-preview:large"],
          ["property", "og:type", "website"],
          ["property", "og:site_name", site.name],
          ["property", "og:locale", "en_US"],
          ["property", "og:url", metadata.canonical],
          ["property", "og:title", metadata.title],
          ["property", "og:description", metadata.description],
          ["property", "og:image", site.image],
          ["property", "og:image:width", "1200"],
          ["property", "og:image:height", "630"],
          ["property", "og:image:alt", site.imageAlt],
          ["name", "twitter:card", "summary_large_image"],
          ["name", "twitter:title", metadata.title],
          ["name", "twitter:description", metadata.description],
          ["name", "twitter:image", site.image],
          ["name", "twitter:image:alt", site.imageAlt],
        ];
        return [
          { tag: "title", children: metadata.title, injectTo: "head" },
          {
            tag: "link",
            attrs: { rel: "canonical", href: metadata.canonical },
            injectTo: "head",
          },
          {
            tag: "link",
            attrs: {
              rel: "sitemap",
              type: "application/xml",
              href: new URL("sitemap.xml", site.url).href,
            },
            injectTo: "head",
          },
          ...values.map(([attribute, key, content]) => ({
            tag: "meta",
            attrs: { [attribute]: key, content },
            injectTo: "head" as const,
          })),
          {
            tag: "script",
            attrs: { type: "application/ld+json" },
            children: JSON.stringify(metadata.structuredData).replaceAll(
              "<",
              "\\u003c",
            ),
            injectTo: "head",
          },
        ];
      },
    },
    {
      name: "sequence-mcp-docs",
      resolveId(id) {
        if (id === "virtual:mcp-docs") return "\0virtual:mcp-docs";
      },
      load(id) {
        if (id === "\0virtual:mcp-docs")
          return `export default ${JSON.stringify(docsCatalog())}`;
      },
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.split("?")[0] !== "/docs/mcp/tools.json") return next();
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify(
              docsCatalog().tools.map(
                ({
                  name,
                  title,
                  description,
                  icons,
                  inputSchema,
                  outputSchema,
                }) => ({
                  name,
                  title,
                  description,
                  icons,
                  inputSchema,
                  outputSchema,
                }),
              ),
              null,
              2,
            ),
          );
        });
      },
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "docs/mcp/tools.json",
          source:
            JSON.stringify(
              docsCatalog().tools.map(
                ({
                  name,
                  title,
                  description,
                  icons,
                  inputSchema,
                  outputSchema,
                }) => ({
                  name,
                  title,
                  description,
                  icons,
                  inputSchema,
                  outputSchema,
                }),
              ),
              null,
              2,
            ) + "\n",
        });
      },
    },
  ],
  base: process.env.BASE_PATH || "./",
  build: {
    target: "es2022",
    rollupOptions: {
      input: {
        app: resolve(import.meta.dirname, "index.html"),
        docs: resolve(import.meta.dirname, "docs/mcp/index.html"),
      },
    },
  },
  worker: { format: "es" },
});
