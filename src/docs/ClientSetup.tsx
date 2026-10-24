import { useState } from "react";
import { cn, skin } from "../components/ui";
import { Code } from "./Code";
import {
  clientConfiguration,
  mcpClients,
  mediaOptions,
  placeholderDirectory,
  type ConfigPlatform,
  type McpClientId,
  type MediaAccess,
} from "./client-configs";

const linkClass =
  "text-indigo-600 underline underline-offset-4 hover:decoration-indigo-500 [[data-theme=dark]_&]:text-indigo-300";

export function ClientSetup({
  clientId,
  version,
  onClientChange,
}: {
  clientId?: string;
  version: string;
  onClientChange: (id: McpClientId) => void;
}) {
  const client =
    mcpClients.find((item) => item.id === clientId) ?? mcpClients[0];
  const [access, setAccess] = useState<MediaAccess>("directories");
  const [platform, setPlatform] = useState<ConfigPlatform>("unix");
  const [folders, setFolders] = useState("");
  const directories = folders
    .split(/\r?\n/)
    .map((folder) => folder.trim())
    .filter(Boolean);
  const code = clientConfiguration(
    client.id,
    version,
    access,
    directories.length ? directories : [placeholderDirectory(platform)],
    platform,
  );
  const option = mediaOptions.find((item) => item.id === access)!;

  return (
    <>
      <p className={cn("mt-3 text-sm leading-7", skin.muted)}>
        Choose your app, set media access, then copy its configuration. Your app
        starts the local companion automatically. Use a local session on the
        same computer as your browser; cloud-only agents cannot reach this
        companion.
      </p>
      <div
        role="tablist"
        aria-label="AI app"
        className="mt-6 flex flex-wrap gap-2"
      >
        {mcpClients.map((item, index) => (
          <button
            key={item.id}
            id={`client-tab-${item.id}`}
            type="button"
            role="tab"
            aria-selected={client.id === item.id}
            aria-controls="client-setup-panel"
            tabIndex={client.id === item.id ? 0 : -1}
            onClick={() => onClientChange(item.id)}
            onKeyDown={(event) => {
              const next =
                event.key === "ArrowRight"
                  ? (index + 1) % mcpClients.length
                  : event.key === "ArrowLeft"
                    ? (index + mcpClients.length - 1) % mcpClients.length
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? mcpClients.length - 1
                        : undefined;
              if (next === undefined) return;
              event.preventDefault();
              onClientChange(mcpClients[next].id);
              document
                .getElementById(`client-tab-${mcpClients[next].id}`)
                ?.focus();
            }}
            className={cn(
              "min-h-10 rounded-lg border px-3 text-xs font-medium transition-colors",
              client.id === item.id
                ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-600 [[data-theme=dark]_&]:text-indigo-300"
                : cn(skin.border, skin.muted, skin.hover),
            )}
          >
            {item.name}
          </button>
        ))}
      </div>
      <div
        id="client-setup-panel"
        role="tabpanel"
        aria-labelledby={`client-tab-${client.id}`}
        tabIndex={0}
        className={cn(
          "mt-4 min-w-0 rounded-xl border p-4 sm:p-6",
          skin.border,
          skin.panel,
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold">Set up {client.name}</h3>
          <a
            className={cn("text-xs", linkClass)}
            href={client.source}
            target="_blank"
            rel="noreferrer"
          >
            Official setup guide ↗
          </a>
        </div>
        <p className={cn("mt-3 text-sm leading-7 break-words", skin.muted)}>
          {client.instructions}
        </p>
        <p className={cn("mt-3 text-xs leading-6", skin.muted)}>
          Keep your existing settings and other servers; add or replace only the
          <code className="mx-1">sequence</code> entry below.
        </p>

        <fieldset className={cn("mt-6 border-t pt-5", skin.border)}>
          <legend className="px-1 text-sm font-semibold">Media access</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {mediaOptions.map((item) => (
              <label
                key={item.id}
                className={cn(
                  "min-w-0 cursor-pointer rounded-lg border p-3",
                  access === item.id
                    ? "border-indigo-500/40 bg-indigo-500/5"
                    : cn(skin.border, skin.hover),
                )}
              >
                <span className="flex items-center gap-2 text-xs font-medium">
                  <input
                    type="radio"
                    name="media-access"
                    value={item.id}
                    checked={access === item.id}
                    onChange={() => setAccess(item.id)}
                    className="size-4 shrink-0 accent-indigo-600"
                  />
                  {item.label}
                </span>
                <code
                  className={cn(
                    "mt-2 block text-[11px] leading-5 break-all",
                    skin.muted,
                  )}
                >
                  {item.flag}
                </code>
              </label>
            ))}
          </div>
          <p
            aria-live="polite"
            className={cn("mt-3 text-xs leading-6", skin.muted)}
          >
            {option.description}
          </p>
          {access === "directories" && (
            <label className="mt-4 block text-xs font-medium">
              Allowed folders
              <textarea
                value={folders}
                onChange={(event) => setFolders(event.target.value)}
                placeholder={placeholderDirectory(platform)}
                rows={2}
                spellCheck={false}
                aria-describedby="media-folders-help"
                className={cn(
                  "mt-2 block w-full resize-y rounded-lg border px-3 py-2 font-mono text-xs leading-6",
                  skin.border,
                  skin.input,
                )}
              />
              <span
                id="media-folders-help"
                className={cn("mt-2 block font-normal leading-6", skin.muted)}
              >
                Enter one existing absolute folder path per line, without
                quotes. Each adds its own <code>--allow-media</code> pair.
                Replace the example path before starting the server;{" "}
                <code>~</code> is not expanded.
              </span>
            </label>
          )}
        </fieldset>
        <label className="mt-5 block text-xs font-medium">
          Operating system
          <select
            value={platform}
            onChange={(event) =>
              setPlatform(event.target.value as ConfigPlatform)
            }
            className={cn(
              "mt-2 block min-h-10 w-full rounded-lg border px-3 text-sm sm:w-auto",
              skin.border,
              skin.input,
            )}
          >
            <option value="unix">macOS / Linux</option>
            <option value="windows">Windows</option>
          </select>
        </label>
        <Code value={code} label={client.file} />
        <p className={cn("text-xs leading-6", skin.muted)}>
          {client.format === "toml" ? "TOML" : "JSON"} · {option.flag}
          {platform === "windows" && " · cmd /c launches npx on Windows"}
        </p>
        <p className={cn("mt-4 text-sm leading-7", skin.muted)}>
          {client.restart}
        </p>
        <p className={cn("mt-2 text-xs leading-6", skin.muted)}>
          After changing media permissions, restart the MCP connection and pair
          again. The editor’s MCP toolbar button shows the active permissions.
        </p>
      </div>
      <details
        className={cn("mt-4 rounded-xl border p-4 text-sm", skin.border)}
      >
        <summary className="cursor-pointer font-medium">
          Another local MCP client?
        </summary>
        <p className={cn("mt-3 leading-7", skin.muted)}>
          Choose local / stdio transport and use the executable and argument
          list from any JSON example above. Some apps use a{" "}
          <code>mcpServers</code> wrapper; use the format documented by your
          client. The GitHub Pages URL downloads the package; it is not a remote
          MCP HTTP endpoint.
        </p>
      </details>
    </>
  );
}
