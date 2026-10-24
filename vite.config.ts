import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import { docsCatalog } from "./companion/docs-catalog.ts";
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
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
                ({ name, title, description, inputSchema, outputSchema }) => ({
                  name,
                  title,
                  description,
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
                ({ name, title, description, inputSchema, outputSchema }) => ({
                  name,
                  title,
                  description,
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
