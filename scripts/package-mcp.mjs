import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const app = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const output = resolve(root, "dist/mcp");
const staging = await mkdtemp(resolve(tmpdir(), "sequence-mcp-package-"));
try {
  if (!process.env.npm_execpath)
    throw new Error("Run this with npm run build:mcp");
  await mkdir(output, { recursive: true });
  const manifest = {
    name: "@alamkanak/sequence-mcp",
    version: app.version,
    description: "Local MCP bridge for the Sequence browser video editor",
    type: "module",
    license: app.license,
    repository: {
      type: "git",
      url: "https://github.com/alamkanak/sequence.git",
    },
    homepage: "https://alamkanak.github.io/sequence/",
    bin: { "sequence-mcp": "server.mjs" },
    files: ["server.mjs", "contracts.mjs", "media.mjs", "LICENSE", "README.md"],
    engines: app.engines,
    dependencies: Object.fromEntries(
      ["@modelcontextprotocol/server", "ws", "zod"].map((name) => [
        name,
        app.dependencies[name],
      ]),
    ),
  };
  await writeFile(
    resolve(staging, "package.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  await writeFile(
    resolve(staging, "server.mjs"),
    (await readFile(resolve(root, "companion/server.mjs"), "utf8")).replace(
      '"./contracts.ts"',
      '"./contracts.mjs"',
    ),
  );
  const contracts = await readFile(
    resolve(root, "companion/contracts.ts"),
    "utf8",
  );
  await writeFile(
    resolve(staging, "contracts.mjs"),
    ts.transpileModule(
      contracts.replace('"../package.json"', '"./package.json"'),
      {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText,
  );
  await copyFile(
    resolve(root, "companion/media.mjs"),
    resolve(staging, "media.mjs"),
  );
  await copyFile(resolve(root, "LICENSE"), resolve(staging, "LICENSE"));
  await writeFile(
    resolve(staging, "README.md"),
    "# Sequence MCP\n\nA local bridge for https://alamkanak.github.io/sequence/.\nRequires Node.js 24+. No repository clone or app build is needed.\n\nConfigure your MCP client to launch this package with npx. Ask your agent to call connect_editor, open its link, and approve the connection in the editor. Media stays in browser storage; requested previews and project data are shared with the connected AI client.\n\nUse --allow-media /absolute/path/to/media for selected directories, or --allow-media-anywhere for any readable directory. Binary imports have no fixed file-size limit.\n\nSource and setup: https://github.com/alamkanak/sequence\nLicense: AGPL-3.0-only.\n",
  );
  const packed = JSON.parse(
    execFileSync(
      process.execPath,
      [
        process.env.npm_execpath,
        "pack",
        "--ignore-scripts",
        "--json",
        "--pack-destination",
        output,
      ],
      {
        cwd: staging,
        env: {
          ...process.env,
          npm_config_cache: resolve(staging, ".npm-cache"),
        },
        encoding: "utf8",
      },
    ),
  );
  const filename = `sequence-mcp-${app.version}.tgz`;
  await rename(resolve(output, packed[0].filename), resolve(output, filename));
  console.log(`MCP package: dist/mcp/${filename} (${packed[0].size} bytes)`);
} finally {
  await rm(staging, { recursive: true, force: true });
}
