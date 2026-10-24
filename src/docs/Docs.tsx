import { useEffect, useRef, useState, type ReactNode } from "react";
import catalog from "virtual:mcp-docs";
import type { DocTool, Schema } from "./catalog";
import { ThemePicker, cn, skin } from "../components/ui";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  CheckIcon,
  CopyIcon,
  ListIcon,
  MagnifyingGlassIcon,
  XIcon,
} from "../components/icons";
import { BrandMark } from "../components/BrandMark";
import { searchPages } from "../../seo.config";

// Relative to this HTML entry, these also work on GitHub Pages project subpaths.
const home = "../../";
const installUrl = `https://alamkanak.github.io/sequence/mcp/sequence-mcp-${catalog.version}.tgz`;
const install = JSON.stringify(
  { mcpServers: { sequence: { command: "npx", args: ["--yes", installUrl] } } },
  null,
  2,
);
const sectionClass = "scroll-mt-28 border-t pt-9 mt-10";
const headingClass = "text-xl font-semibold tracking-tight";
const linkClass =
  "text-indigo-600 underline decoration-indigo-500/30 underline-offset-4 hover:decoration-indigo-500 [[data-theme=dark]_&]:text-indigo-300";

function Code({ value, label = "JSON" }: { value: string; label?: string }) {
  const [status, setStatus] = useState("Copy");
  useEffect(() => {
    setStatus("Copy");
  }, [value]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("Copied");
    } catch {
      setStatus("Select the code to copy");
    }
  }
  return (
    <div
      className={cn(
        "my-5 min-w-0 overflow-hidden rounded-xl border",
        skin.border,
        skin.panel,
      )}
    >
      <div
        className={cn(
          "flex min-h-11 items-center justify-between gap-2 border-b px-4 text-xs",
          skin.border,
          skin.muted,
        )}
      >
        <span className="font-mono">{label}</span>
        <button
          type="button"
          onClick={() => void copy()}
          aria-label={`Copy ${label}`}
          className="flex min-h-9 items-center gap-2 rounded px-2 hover:text-indigo-500"
        >
          {status === "Copied" ? (
            <CheckIcon size={14} />
          ) : (
            <CopyIcon size={14} />
          )}
          <span aria-live="polite">{status}</span>
        </button>
      </div>
      <pre
        tabIndex={0}
        className="max-h-[34rem] overflow-auto p-5 text-xs leading-7 text-zinc-700 sm:text-sm [[data-theme=dark]_&]:text-zinc-300"
      >
        <code>{value}</code>
      </pre>
    </div>
  );
}

function schemaType(schema: Schema): string {
  if (schema.const !== undefined) return JSON.stringify(schema.const);
  if (schema.enum) return schema.enum.map((v) => JSON.stringify(v)).join(" | ");
  if (schema.anyOf || schema.oneOf)
    return [...new Set((schema.anyOf ?? schema.oneOf)!.map(schemaType))].join(
      " | ",
    );
  if (schema.type === "array") return `${schemaType(schema.items ?? {})}[]`;
  return Array.isArray(schema.type)
    ? schema.type.join(" | ")
    : (schema.type ?? "object");
}
function constraints(schema: Schema) {
  const labels: string[] = [];
  if (
    schema.minimum !== undefined &&
    schema.minimum !== Number.MIN_SAFE_INTEGER
  )
    labels.push(`≥ ${schema.minimum}`);
  if (
    schema.maximum !== undefined &&
    schema.maximum !== Number.MAX_SAFE_INTEGER
  )
    labels.push(`≤ ${schema.maximum}`);
  if (schema.exclusiveMinimum !== undefined)
    labels.push(`> ${schema.exclusiveMinimum}`);
  if (schema.exclusiveMaximum !== undefined)
    labels.push(`< ${schema.exclusiveMaximum}`);
  if (schema.multipleOf !== undefined)
    labels.push(`multiple of ${schema.multipleOf}`);
  if (schema.minItems !== undefined)
    labels.push(`min ${schema.minItems} items`);
  if (schema.maxItems !== undefined)
    labels.push(`max ${schema.maxItems} items`);
  if (schema.minLength !== undefined)
    labels.push(`min ${schema.minLength} characters`);
  if (schema.maxLength !== undefined)
    labels.push(`max ${schema.maxLength} characters`);
  if (schema.default !== undefined)
    labels.push(`default: ${JSON.stringify(schema.default)}`);
  if (schema.pattern) labels.push(`pattern: ${schema.pattern}`);
  if (schema.format) labels.push(schema.format);
  return labels;
}

function Fields({ schema, depth = 0 }: { schema: Schema; depth?: number }) {
  const variants = schema.anyOf ?? schema.oneOf;
  if (variants)
    return (
      <div className="space-y-4">
        {variants.map((variant, index) => (
          <div key={index}>
            <p className={cn("mb-3 text-xs font-semibold", skin.muted)}>
              Variant {index + 1}
              {variant.description ? ` · ${variant.description}` : ""}
            </p>
            <Fields schema={variant} depth={depth} />
          </div>
        ))}
      </div>
    );
  const entries = Object.entries(schema.properties ?? {});
  if (!entries.length)
    return (
      <p className={cn("text-sm leading-7", skin.muted)}>
        {schema.type === "object"
          ? "No parameters. Pass an empty object: {}."
          : schemaType(schema)}
      </p>
    );
  return (
    <div
      className={cn(
        "divide-y divide-zinc-200 [[data-theme=dark]_&]:divide-white/[0.08]",
        depth > 0 && "pl-3 sm:pl-4",
      )}
    >
      {entries.map(([name, field]) => {
        const nested =
          field.properties || field.items || field.anyOf || field.oneOf;
        const nestedSchema = field.items ?? field;
        return (
          <div key={name} className="min-w-0 py-5 first:pt-0 last:pb-0">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
              <code className="text-sm font-semibold break-all">{name}</code>
              <span
                className={cn(
                  "max-w-full font-mono text-xs break-words",
                  skin.muted,
                )}
              >
                {schemaType(field)}
              </span>
              <span
                className={cn(
                  "text-[11px] font-medium",
                  schema.required?.includes(name)
                    ? "text-amber-700 [[data-theme=dark]_&]:text-amber-400"
                    : skin.muted,
                )}
              >
                {schema.required?.includes(name) ? "required" : "optional"}
              </span>
            </div>
            {field.description && (
              <p className={cn("mt-2 text-sm leading-6", skin.muted)}>
                {field.description}
              </p>
            )}
            {constraints(field).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {constraints(field).map((label) => (
                  <code
                    key={label}
                    className={cn(
                      "max-w-full rounded border px-2 py-0.5 text-[11px] break-all",
                      skin.border,
                      skin.raised,
                      skin.muted,
                    )}
                  >
                    {label}
                  </code>
                ))}
              </div>
            )}
            {nested && depth < 8 && (
              <details
                className={cn(
                  "mt-3 rounded-lg border p-3 text-sm",
                  skin.border,
                )}
              >
                <summary className="cursor-pointer text-xs font-medium">
                  {field.items ? "Array item schema" : "Nested fields"}
                </summary>
                <div className="mt-5">
                  <Fields schema={nestedSchema} depth={depth + 1} />
                </div>
              </details>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Note({
  children,
  title = "Before you begin",
}: {
  children: ReactNode;
  title?: string;
}) {
  return (
    <div className="my-6 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-5 py-4">
      <p className="text-sm font-semibold text-indigo-700 [[data-theme=dark]_&]:text-indigo-300">
        {title}
      </p>
      <div className={cn("mt-2 text-sm leading-7", skin.muted)}>{children}</div>
    </div>
  );
}

function ToolPage({
  tool,
  variantName,
  navigate,
  tab,
  setTab,
}: {
  tool: DocTool;
  variantName?: string;
  navigate: (hash: string) => void;
  tab: string;
  setTab: (value: string) => void;
}) {
  const [exampleIndex, setExampleIndex] = useState(0);
  const variant =
    tool.variants.find(
      (v) =>
        String(v.properties?.op?.const ?? v.properties?.action?.const) ===
        variantName,
    ) ?? tool.variants[0];
  const selection = variant
    ? String(variant.properties?.op?.const ?? variant.properties?.action?.const)
    : "";
  useEffect(() => {
    if (!selection) return;
    const matching = tool.examples.findIndex((item) => {
      const args = item.arguments as {
        action?: string;
        operations?: { op: string }[];
      };
      return (
        args.action === selection || args.operations?.[0]?.op === selection
      );
    });
    if (matching >= 0) setExampleIndex(matching);
  }, [selection, tool]);
  const example =
    tool.examples[Math.min(exampleIndex, tool.examples.length - 1)];
  const isEditing = tool.name === "apply_edits";
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
        <span className={skin.muted}>Tool reference</span>
        <span className={skin.muted}>/</span>
        <span className="text-indigo-600 [[data-theme=dark]_&]:text-indigo-300">
          {tool.category}
        </span>
      </div>
      <h1 className="mt-4 font-mono text-2xl font-semibold tracking-tight break-all sm:text-3xl">
        {tool.name}
      </h1>
      <p className={cn("mt-5 text-base leading-8", skin.muted)}>
        {tool.description}
      </p>
      <div
        className={cn(
          "mt-6 flex flex-wrap items-center gap-3 text-xs",
          skin.muted,
        )}
      >
        <span className={cn("rounded-full border px-2.5 py-1", skin.border)}>
          Strict parameters
        </span>
        <span>Same descriptions exposed to your agent</span>
      </div>
      <div
        role="tablist"
        aria-label="Reference format"
        className={cn("mt-9 flex gap-6 border-b text-sm", skin.border)}
      >
        {[
          ["reference", "Reference"],
          ["schema", "JSON Schema"],
        ].map(([value, label], index, tabs) => (
          <button
            key={value}
            id={`tab-${value}`}
            type="button"
            role="tab"
            tabIndex={tab === value ? 0 : -1}
            aria-controls={`panel-${value}`}
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            onKeyDown={(event) => {
              if (
                ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              ) {
                event.preventDefault();
                const next =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? tabs.length - 1
                      : (index +
                          (event.key === "ArrowRight" ? 1 : -1) +
                          tabs.length) %
                        tabs.length;
                setTab(tabs[next][0]);
                document.getElementById(`tab-${tabs[next][0]}`)?.focus();
              }
            }}
            className={cn(
              "border-b-2 py-3 font-medium",
              tab === value
                ? "border-indigo-600 text-indigo-600 [[data-theme=dark]_&]:text-indigo-300"
                : "border-transparent",
              tab !== value && skin.muted,
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "schema" ? (
        <div
          id="panel-schema"
          role="tabpanel"
          aria-labelledby="tab-schema"
          tabIndex={0}
        >
          <Code
            value={JSON.stringify(
              {
                inputSchema: tool.inputSchema,
                outputSchema: tool.outputSchema,
              },
              null,
              2,
            )}
            label="JSON Schema"
          />
          <a className={cn("text-sm", linkClass)} href="./tools.json" download>
            Download all tool definitions
          </a>
        </div>
      ) : (
        <div
          id="panel-reference"
          role="tabpanel"
          aria-labelledby="tab-reference"
        >
          <section id="parameters" className="scroll-mt-28 pt-8">
            <h2 className={headingClass}>Parameters</h2>
            <p className={cn("mt-2 mb-7 text-sm leading-7", skin.muted)}>
              Unknown fields are rejected, including inside nested objects.
            </p>
            {tool.variants.length > 0 && !isEditing ? (
              <>
                <VariantSelect
                  variants={tool.variants}
                  selection={selection}
                  label="Action"
                  onChange={(value) => navigate(`${tool.name}/${value}`)}
                />
                <p className={cn("my-5 text-sm leading-7", skin.muted)}>
                  {variant.description}
                </p>
                <Fields schema={variant} />
              </>
            ) : (
              <Fields
                schema={
                  isEditing
                    ? {
                        ...tool.inputSchema,
                        properties: Object.fromEntries(
                          Object.entries(
                            tool.inputSchema.properties ?? {},
                          ).filter(([name]) => name !== "operations"),
                        ),
                      }
                    : tool.inputSchema
                }
              />
            )}
          </section>
          {isEditing && (
            <section id="operations" className={cn(sectionClass, skin.border)}>
              <h2 className={headingClass}>Editing operations</h2>
              <p className={cn("mt-3 mb-5 text-sm leading-7", skin.muted)}>
                Supply 1–500 regular operations in <code>operations</code>. Undo
                and redo each require a batch containing only that operation.
              </p>
              <VariantSelect
                variants={tool.variants}
                selection={selection}
                label="Operation"
                onChange={(value) =>
                  navigate(`${tool.name}/${value}--operations`)
                }
              />
              <p className={cn("my-5 text-sm leading-7", skin.muted)}>
                {variant.description}
              </p>
              <Fields schema={variant} />
            </section>
          )}
          <section id="examples" className={cn(sectionClass, skin.border)}>
            <h2 className={headingClass}>Examples</h2>
            <p className={cn("mt-3 text-sm leading-7", skin.muted)}>
              Example arguments are checked against the tool schema on every
              build. Replace sample IDs and revisions with values from your
              project.
            </p>
            {tool.examples.length > 1 && (
              <label className="mt-5 block text-xs font-medium">
                Example
                <select
                  value={exampleIndex}
                  onChange={(e) => setExampleIndex(Number(e.target.value))}
                  className={cn(
                    "mt-2 block min-h-10 w-full rounded-lg px-3 text-sm",
                    skin.input,
                  )}
                >
                  {tool.examples.map((item, index) => (
                    <option key={item.label} value={index}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <Code
              value={JSON.stringify(
                { name: tool.name, arguments: example.arguments },
                null,
                2,
              )}
              label="Tool call"
            />
          </section>
          <section id="response" className={cn(sectionClass, skin.border)}>
            <h2 className={headingClass}>Response</h2>
            <p className={cn("mt-3 mb-6 text-sm leading-7", skin.muted)}>
              Successful structured content follows this schema. Tool failures
              are returned as MCP errors with a descriptive message.
            </p>
            <Fields schema={tool.outputSchema} />
          </section>
        </div>
      )}
    </>
  );
}

function VariantSelect({
  variants,
  selection,
  label,
  onChange,
}: {
  variants: Schema[];
  selection: string;
  label: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs font-semibold">
      {label}
      <select
        value={selection}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "mt-2 block min-h-11 w-full rounded-lg px-3 font-mono text-sm",
          skin.input,
        )}
      >
        {variants.map((v) => {
          const name = String(
            v.properties?.op?.const ?? v.properties?.action?.const,
          );
          return (
            <option key={name} value={name}>
              {name}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function Guide({ workflow }: { workflow: boolean }) {
  return (
    <>
      <p className="text-xs font-semibold text-indigo-600 [[data-theme=dark]_&]:text-indigo-300">
        SEQUENCE / MCP DOCUMENTATION
      </p>
      <h1 className="mt-4 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
        {workflow
          ? "From connection to final cut."
          : "MCP video editor setup and tool reference."}
      </h1>
      <p className={cn("mt-5 text-base leading-8", skin.muted)}>
        {workflow
          ? "A reliable editing workflow starts with inspection and ends with a preview. Every change stays visible in the same timeline you use by hand."
          : "Connect Claude Code, Codex, Cursor, or another AI agent to Sequence’s free browser video editor through MCP. Explore the tools, their exact parameters, and examples generated from the server’s own definitions."}
      </p>
      <Note>
        Requires Node.js 24+, a local MCP client, and desktop Chrome or Edge.
        Keep the approved editor tab open while your agent works.
      </Note>
      {workflow ? (
        <>
          <section id="workflow" className={cn(sectionClass, skin.border)}>
            <h2 className={headingClass}>The editing loop</h2>
            <ol className="mt-6 space-y-6">
              {[
                [
                  "connect_editor",
                  "Connect",
                  "Show the pairing link to the user. They open it and approve access to their browser-local project.",
                ],
                [
                  "inspect_project",
                  "Inspect",
                  "Read the revision, stable IDs, missing media and browser capabilities. Relink missing files before rendering.",
                ],
                [
                  "apply_edits",
                  "Validate, then apply",
                  "Prepare a typed batch using the inspected revision and a new idempotency key. Use validateOnly to check it first, then commit the same batch.",
                ],
                [
                  "preview_frame",
                  "Review",
                  "Request a frame and review the composed result with the user. Inspect again before preparing more edits.",
                ],
                [
                  "export_video",
                  "Export",
                  "Start an export, poll manage_jobs with its job ID, and download the completed video through the editor.",
                ],
              ].map(([name, title, text], index) => (
                <li key={name} className="flex gap-4">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-xs font-semibold text-indigo-600 [[data-theme=dark]_&]:text-indigo-300">
                    {index + 1}
                  </span>
                  <div>
                    <a
                      href={`#${name}`}
                      className="text-sm font-semibold hover:text-indigo-500"
                    >
                      {title}{" "}
                      <span
                        className={cn(
                          "ml-2 font-mono text-xs font-normal",
                          skin.muted,
                        )}
                      >
                        {name}
                      </span>
                    </a>
                    <p className={cn("mt-2 text-sm leading-7", skin.muted)}>
                      {text}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
          <section id="retries" className={cn(sectionClass, skin.border)}>
            <h2 className={headingClass}>Revisions and retries</h2>
            <p className={cn("mt-4 text-sm leading-7", skin.muted)}>
              A stale revision rejects a new batch. Inspect again and rebuild
              the edit against the latest project. For a retry after an
              uncertain response, reuse the original idempotency key and
              arguments. The companion returns the earlier receipt while that
              receipt remains in the editor session. Validation does not commit
              a change or reserve its key.
            </p>
          </section>
        </>
      ) : (
        <>
          <section id="installation" className="scroll-mt-28 pt-5">
            <h2 className={headingClass}>1. Add Sequence to your AI app</h2>
            <p className={cn("mt-3 text-sm leading-7", skin.muted)}>
              For Claude Desktop, Cursor, and clients accepting{" "}
              <code>mcpServers</code>, add this configuration. Your AI app
              starts the local companion using npx.
            </p>
            <Code value={install} label="MCP configuration" />
            <details
              className={cn("rounded-xl border p-4 text-sm", skin.border)}
            >
              <summary className="cursor-pointer font-medium">
                VS Code or a client with a server form
              </summary>
              <p className={cn("mt-4 leading-7", skin.muted)}>
                For a server form, choose local / stdio, command{" "}
                <code>npx</code>, and the two arguments below. In VS Code, use a{" "}
                <code>servers</code> wrapper instead of <code>mcpServers</code>{" "}
                and include <code>"type": "stdio"</code>.
              </p>
              <Code value={`--yes\n${installUrl}`} label="Server arguments" />
            </details>
          </section>
          <section id="connection" className={cn(sectionClass, skin.border)}>
            <h2 className={headingClass}>2. Connect your project</h2>
            <ol
              className={cn(
                "mt-5 list-decimal space-y-3 pl-5 text-sm leading-7",
                skin.muted,
              )}
            >
              <li>
                Refresh your AI app’s MCP connection and ask it to call{" "}
                <a className={linkClass} href="#connect_editor">
                  connect_editor
                </a>
                .
              </li>
              <li>
                Open the pairing link. Approve{" "}
                <strong className="font-medium">Connect AI agent</strong> and
                any browser local-network permission prompt.
              </li>
              <li>
                Keep one connected editor tab open. Ask the agent to inspect the
                project before editing.
              </li>
            </ol>
          </section>
          <section id="local-media" className={cn(sectionClass, skin.border)}>
            <h2 className={headingClass}>3. Bring your media</h2>
            <p className={cn("mt-4 text-sm leading-7", skin.muted)}>
              Import media in the browser, or append <code>--allow-media</code>{" "}
              and an absolute directory path to your MCP arguments. Repeat for
              additional directories. Agent imports are limited to those
              directories. Use <code>--allow-media-anywhere</code> to permit any
              readable directory. Binary transfers have no fixed file-size
              limit.
            </p>
            <Note title="Your browser owns the project">
              Project data and requested preview images are shared with your
              connected AI client. Original media, rendering and completed
              exports stay in the browser. Pairing requires a local companion on
              the same computer as your browser.
            </Note>
          </section>
          <a
            href="#workflow"
            className={cn(
              "mt-8 flex items-center justify-between rounded-xl border p-5 text-sm font-medium hover:border-indigo-500/40",
              skin.border,
              skin.panel,
            )}
          >
            Follow the editing workflow <ArrowRightIcon size={18} />
          </a>
        </>
      )}
      <section id="tools" className={cn(sectionClass, skin.border)}>
        <h2 className={headingClass}>Explore the tools</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {catalog.tools.map((tool) => (
            <a
              key={tool.name}
              href={`#${tool.name}`}
              className={cn(
                "group min-w-0 rounded-xl border p-4 transition-colors hover:border-indigo-500/40",
                skin.border,
                skin.panel,
              )}
            >
              <p className="flex items-center justify-between gap-2 font-mono text-xs font-semibold group-hover:text-indigo-500">
                {tool.name}
                <ArrowUpRightIcon size={14} className="shrink-0" />
              </p>
              <p className={cn("mt-2 text-xs", skin.muted)}>
                {tool.title} · {tool.category}
              </p>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}

export function Docs() {
  const [hash, setHash] = useState(() =>
    typeof location === "undefined"
      ? "getting-started"
      : location.hash.slice(1) || "getting-started",
  );
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState(false);
  const [format, setFormat] = useState("reference");
  const searchRef = useRef<HTMLInputElement>(null);
  const route = hash.split("--")[0];
  const [page, variant] = route.split("/");
  useEffect(() => {
    setFormat("reference");
  }, [page]);
  const tool = catalog.tools.find((item) => item.name === page);
  const filtered = catalog.tools.filter((item) =>
    `${item.name} ${item.title} ${item.description} ${JSON.stringify(item.inputSchema)} ${JSON.stringify(item.outputSchema)}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  useEffect(() => {
    const update = () => {
      setHash(location.hash.slice(1) || "getting-started");
      setMenu(false);
    };
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setMenu(true);
        requestAnimationFrame(() => searchRef.current?.focus());
      }
      if (event.key === "Escape") {
        setMenu(false);
        document.getElementById("docs-menu")?.focus();
      }
    };
    window.addEventListener("hashchange", update);
    window.addEventListener("keydown", shortcut);
    return () => {
      window.removeEventListener("hashchange", update);
      window.removeEventListener("keydown", shortcut);
    };
  }, []);
  useEffect(() => {
    document.title =
      page === "getting-started"
        ? searchPages.docs.title
        : `${tool?.title ?? "Editing workflow"} — Sequence MCP`;
    const section = hash.split("--")[1];
    if (section)
      document.getElementById(section)?.scrollIntoView({ behavior: "instant" });
    else window.scrollTo({ top: 0 });
  }, [hash, page, tool]);
  function navigate(next: string) {
    location.hash = next;
  }
  const outline = tool
    ? [
        "parameters",
        ...(tool.name === "apply_edits" ? ["operations"] : []),
        "examples",
        "response",
      ]
    : page === "workflow"
      ? ["workflow", "retries", "tools"]
      : ["installation", "connection", "local-media", "tools"];
  return (
    <div
      className={cn(
        "min-h-dvh font-sans antialiased [color-scheme:light] [[data-theme=dark]_&]:[color-scheme:dark] [&_a]:focus-visible:outline-2 [&_a]:focus-visible:outline-offset-4 [&_a]:focus-visible:outline-indigo-500 [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-indigo-500 [&_select]:focus-visible:outline-2 [&_select]:focus-visible:outline-indigo-500",
        skin.app,
      )}
    >
      <a
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
        className="sr-only fixed top-4 left-4 z-50 rounded-lg bg-indigo-600 px-5 py-3 text-sm text-white focus:not-sr-only"
      >
        Skip to content
      </a>
      <header
        className={cn("sticky top-0 z-30 border-b", skin.border, skin.panel)}
      >
        <div className="mx-auto flex min-h-18 max-w-[1500px] items-center gap-3 px-5 sm:px-8">
          <a
            href={home}
            className="flex shrink-0 items-center gap-2 text-lg font-semibold tracking-tight"
          >
            <BrandMark size={25} />
            Sequence
          </a>
          <span
            className={cn(
              "ml-1 hidden border-l pl-4 text-sm sm:block",
              skin.border,
              skin.muted,
            )}
          >
            Documentation
          </span>
          <span
            className={cn(
              "hidden rounded-full border px-2 py-0.5 font-mono text-[10px] md:block",
              skin.border,
              skin.muted,
            )}
          >
            v{catalog.version}
          </span>
          <div className="ml-auto flex items-center gap-3">
            <ThemePicker compact />
            <a
              href={`${home}#/editor`}
              className="hidden min-h-9 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-700 sm:inline-flex"
            >
              Open editor <ArrowUpRightIcon size={14} />
            </a>
            <button
              id="docs-menu"
              type="button"
              aria-label={
                menu
                  ? "Close documentation navigation"
                  : "Open documentation navigation"
              }
              aria-expanded={menu}
              aria-controls="docs-navigation"
              className={cn(
                "flex size-10 items-center justify-center rounded-lg border lg:hidden",
                skin.border,
              )}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <XIcon size={20} /> : <ListIcon size={20} />}
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1500px] grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)_190px]">
        <aside
          id="docs-navigation"
          className={cn(
            "z-20 border-b px-5 py-6 lg:sticky lg:top-18 lg:block lg:h-[calc(100dvh-4.5rem)] lg:overflow-y-auto lg:border-r lg:border-b-0 lg:px-6 lg:py-8",
            skin.border,
            skin.panel,
            menu ? "block" : "hidden",
          )}
        >
          <label
            className={cn(
              "flex min-h-10 items-center gap-2 rounded-lg border px-3",
              skin.border,
              skin.raised,
            )}
          >
            <MagnifyingGlassIcon
              size={16}
              className={cn("shrink-0", skin.muted)}
            />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search documentation"
              placeholder="Search docs…"
              className="min-w-0 flex-1 bg-transparent py-2 text-xs outline-none"
            />
            <kbd className={cn("text-[10px]", skin.muted)}>⌘K</kbd>
          </label>
          <nav aria-label="Documentation" className="mt-7 space-y-7">
            <div>
              <p
                className={cn(
                  "mb-2 px-2 text-[10px] font-semibold tracking-widest uppercase",
                  skin.muted,
                )}
              >
                Get started
              </p>
              {[
                ["getting-started", "Introduction"],
                ["workflow", "Editing workflow"],
              ].map(([key, title]) => (
                <a
                  key={key}
                  href={`#${key}`}
                  aria-current={!tool && page === key ? "page" : undefined}
                  className={cn(
                    "my-0.5 block rounded-lg px-3 py-2.5 text-sm",
                    !tool && page === key
                      ? "bg-indigo-500/10 font-medium text-indigo-600 [[data-theme=dark]_&]:text-indigo-300"
                      : skin.muted,
                    skin.hover,
                  )}
                >
                  {title}
                </a>
              ))}
            </div>
            {query && (
              <p role="status" className={cn("px-2 text-xs", skin.muted)}>
                {filtered.length} tool{filtered.length === 1 ? "" : "s"} found
              </p>
            )}
            {["Connection", "Editing", "Rendering"].map((category) => {
              const items = filtered.filter(
                (item) => item.category === category,
              );
              return (
                items.length > 0 && (
                  <div key={category}>
                    <p
                      className={cn(
                        "mb-2 px-2 text-[10px] font-semibold tracking-widest uppercase",
                        skin.muted,
                      )}
                    >
                      {category}
                    </p>
                    {items.map((item) => (
                      <a
                        key={item.name}
                        href={`#${item.name}`}
                        aria-current={
                          tool?.name === item.name ? "page" : undefined
                        }
                        className={cn(
                          "my-0.5 block rounded-lg px-3 py-2.5 font-mono text-xs",
                          tool?.name === item.name
                            ? "bg-indigo-500/10 font-medium text-indigo-600 [[data-theme=dark]_&]:text-indigo-300"
                            : skin.muted,
                          skin.hover,
                        )}
                      >
                        {item.name}
                      </a>
                    ))}
                  </div>
                )
              );
            })}
          </nav>
          <div
            className={cn(
              "mt-9 border-t pt-5 text-xs leading-6",
              skin.border,
              skin.muted,
            )}
          >
            <a href="./tools.json" download className="hover:text-indigo-500">
              Download tool definitions ↗
            </a>
          </div>
        </aside>
        <main
          id="main-content"
          tabIndex={-1}
          className="min-w-0 px-5 py-10 outline-none sm:px-10 sm:py-12 lg:px-12 xl:px-14"
        >
          <div className="mx-auto max-w-3xl">
            {tool ? (
              <ToolPage
                key={tool.name}
                tool={tool}
                variantName={variant}
                navigate={navigate}
                tab={format}
                setTab={setFormat}
              />
            ) : page === "getting-started" || page === "workflow" ? (
              <Guide workflow={page === "workflow"} />
            ) : (
              <>
                <h1 className="text-3xl font-semibold">Page not found</h1>
                <p className={cn("mt-4 text-sm", skin.muted)}>
                  This reference link does not match a tool or guide.
                </p>
                <a
                  href="#getting-started"
                  className={cn("mt-6 inline-block text-sm", linkClass)}
                >
                  Go to the introduction
                </a>
              </>
            )}
            <footer
              className={cn(
                "mt-14 flex flex-wrap items-center justify-between gap-4 border-t pt-6 text-xs",
                skin.border,
                skin.muted,
              )}
            >
              <span>Sequence MCP · v{catalog.version}</span>
              <a
                href="https://github.com/alamkanak/sequence"
                className="hover:text-indigo-500"
              >
                View source ↗
              </a>
            </footer>
          </div>
        </main>
        <aside
          aria-label="On this page"
          className="sticky top-18 hidden h-fit py-12 pr-6 xl:block"
        >
          <p className="text-xs font-semibold">On this page</p>
          <nav
            aria-label="On this page"
            className={cn(
              "mt-4 flex flex-col gap-3 border-l pl-4 text-xs leading-6",
              skin.border,
              skin.muted,
            )}
          >
            {outline.map((section) => (
              <a
                key={section}
                href={`#${route}--${section}`}
                onClick={() => {
                  setFormat("reference");
                  requestAnimationFrame(() =>
                    document.getElementById(section)?.scrollIntoView(),
                  );
                }}
                className="capitalize hover:text-indigo-500"
              >
                {section.replaceAll("-", " ")}
              </a>
            ))}
          </nav>
          <p className={cn("mt-8 max-w-36 text-[11px] leading-6", skin.muted)}>
            Reference generated from the same contracts your agent receives.
          </p>
        </aside>
      </div>
    </div>
  );
}
