export type ConfigFormat =
  "toml" | "mcpServers" | "vscode" | "copilot" | "opencode";

interface McpClient {
  id: string;
  name: string;
  format: ConfigFormat;
  file: string;
  instructions: string;
  restart: string;
  source: string;
}

// Verified against each client's official documentation on 2026-10-24.
export const mcpClients = [
  {
    id: "codex",
    name: "Codex",
    format: "toml",
    file: ".codex/config.toml",
    instructions:
      "Create this file in your project, or use ~/.codex/config.toml for all projects. Project configuration loads only in trusted projects. The local app, CLI, and IDE extension use Codex configuration.",
    restart:
      "Restart the Codex MCP connection or start a new session. In the CLI, use /mcp to check that sequence is connected.",
    source: "https://developers.openai.com/codex/mcp",
  },
  {
    id: "claude-code",
    name: "Claude Code",
    format: "mcpServers",
    file: ".mcp.json",
    instructions:
      "Create this file at the project root. Merge sequence into mcpServers if the file already exists. Claude Code asks you to approve project MCP servers when you open the project interactively.",
    restart:
      "Restart Claude Code, approve the project server, and use /mcp to check its status.",
    source: "https://code.claude.com/docs/en/mcp",
  },
  {
    id: "cursor",
    name: "Cursor",
    format: "mcpServers",
    file: ".cursor/mcp.json",
    instructions:
      "Create this file in your project, or use ~/.cursor/mcp.json for all projects. Merge sequence into the existing mcpServers object.",
    restart:
      "Open Cursor’s MCP settings, enable sequence, and refresh the connection if needed. Use a local agent session.",
    source: "https://cursor.com/docs/mcp",
  },
  {
    id: "vscode",
    name: "VS Code Copilot",
    format: "vscode",
    file: ".vscode/mcp.json",
    instructions:
      "For VS Code’s local harness, create this workspace file with a servers object. Newer VS Code setup flows prefer shared Copilot configuration; use the Copilot CLI tab for that mcpServers format instead. The workspace format below remains supported for compatibility.",
    restart:
      "Run MCP: List Servers, select sequence, and start or restart it. Enable its tools in agent chat.",
    source:
      "https://code.visualstudio.com/docs/agents/reference/mcp-configuration",
  },
  {
    id: "copilot-cli",
    name: "Copilot CLI",
    format: "copilot",
    file: "~/.copilot/mcp-config.json",
    instructions:
      "Add sequence under mcpServers in your user configuration. This is also the shared Copilot global format used by newer VS Code setup flows. For a trusted project only, use .mcp.json at its root.",
    restart:
      "Restart Copilot and run /mcp to check the server. Keep tool approval enabled when prompted.",
    source:
      "https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers",
  },
  {
    id: "gemini-cli",
    name: "Gemini CLI",
    format: "mcpServers",
    file: ".gemini/settings.json",
    instructions:
      "Create this file in your project, or use ~/.gemini/settings.json for all projects. Merge sequence into mcpServers alongside your existing settings.",
    restart:
      "Restart Gemini CLI, then use /mcp to check discovery. Approve tool calls when prompted.",
    source: "https://geminicli.com/docs/tools/mcp-server/",
  },
  {
    id: "windsurf",
    name: "Windsurf / Devin",
    format: "mcpServers",
    file: "mcp_config.json",
    instructions:
      "Open Cascade’s MCP settings and open its raw configuration file. Older Windsurf installs use ~/.codeium/windsurf/mcp_config.json; current Devin Desktop uses ~/.config/devin/mcp_config.json on macOS/Linux or %APPDATA%\\devin\\mcp_config.json on Windows. Edit the file your app opens.",
    restart:
      "Save the file, refresh the MCP connection, and enable sequence in Cascade’s MCP panel.",
    source: "https://docs.devin.ai/desktop/cascade/mcp",
  },
  {
    id: "cline",
    name: "Cline",
    format: "mcpServers",
    file: "cline_mcp_settings.json",
    instructions:
      "In the Cline panel, open MCP Servers → Configure → Configure MCP Servers. Paste the entry into the file it opens. The CLI uses ~/.cline/data/settings/cline_mcp_settings.json unless overridden.",
    restart:
      "Save the configuration and check sequence in the MCP Servers panel. Restart its connection if needed.",
    source: "https://docs.cline.bot/mcp/mcp-overview",
  },
  {
    id: "roo-code",
    name: "Roo Code",
    format: "mcpServers",
    file: ".roo/mcp.json",
    instructions:
      "Open Roo’s MCP Servers panel and choose Edit Project MCP to create this file. Merge sequence into mcpServers. Edit Global MCP is available for a user-wide setup.",
    restart:
      "Save the file and restart sequence from Roo’s MCP Servers panel if it does not reconnect automatically.",
    source:
      "https://roocodeinc.github.io/Roo-Code/features/mcp/using-mcp-in-roo/",
  },
  {
    id: "opencode",
    name: "OpenCode",
    format: "opencode",
    file: "opencode.json",
    instructions:
      "Create this file at your project root, or use ~/.config/opencode/opencode.json globally. OpenCode uses an mcp object and puts the executable and all arguments in one command array.",
    restart:
      "Restart OpenCode and use opencode mcp list to check that sequence is connected.",
    source: "https://opencode.ai/docs/mcp-servers/",
  },
  {
    id: "kiro",
    name: "Kiro",
    format: "mcpServers",
    file: ".kiro/settings/mcp.json",
    instructions:
      "Create this workspace file, or use ~/.kiro/settings/mcp.json for all projects. Merge sequence into mcpServers. Use Kiro locally on the same computer as your browser.",
    restart:
      "Save the file and reconnect sequence from Kiro’s MCP view. Approve tool calls when prompted.",
    source: "https://kiro.dev/docs/mcp/configuration/",
  },
  {
    id: "claude-desktop",
    name: "Claude Desktop",
    format: "mcpServers",
    file: "claude_desktop_config.json",
    instructions:
      "Open Settings → Developer → Edit Config. On macOS the file is ~/Library/Application Support/Claude/claude_desktop_config.json; on Windows it is %APPDATA%\\Claude\\claude_desktop_config.json. Merge sequence into mcpServers.",
    restart:
      "Fully quit and reopen Claude Desktop, then check that Sequence’s tools are available in a new chat.",
    source:
      "https://modelcontextprotocol.io/docs/develop/connect-local-servers",
  },
] as const satisfies readonly McpClient[];

export type McpClientId = (typeof mcpClients)[number]["id"];
export type MediaAccess = "directories" | "anywhere" | "none";
export type ConfigPlatform = "unix" | "windows";

export const mediaOptions = [
  {
    id: "directories",
    label: "Specific folders",
    flag: "--allow-media",
    description:
      "Agent imports can read only these folders and their subfolders. Repeat the flag for each folder.",
  },
  {
    id: "anywhere",
    label: "Any directory",
    flag: "--allow-media-anywhere",
    description:
      "Agent imports can read files from any directory accessible to the companion process. No folder path is needed.",
  },
  {
    id: "none",
    label: "Browser imports only",
    flag: "No media flag",
    description:
      "Agent file imports are disabled. You can still import files in the browser and let the agent edit them.",
  },
] as const satisfies readonly {
  id: MediaAccess;
  label: string;
  flag: string;
  description: string;
}[];

export function placeholderDirectory(platform: ConfigPlatform) {
  return platform === "windows"
    ? "C:\\Users\\you\\Videos"
    : "/absolute/path/to/assets";
}

/** One argument list feeds every client format, including paths with spaces. */
export function clientConfiguration(
  client: McpClientId,
  version: string,
  access: MediaAccess,
  directories: string[],
  platform: ConfigPlatform,
) {
  const definition = mcpClients.find((item) => item.id === client)!;
  const args = [
    "--yes",
    `https://alamkanak.github.io/sequence/mcp/sequence-mcp-${version}.tgz`,
    ...(access === "anywhere"
      ? ["--allow-media-anywhere"]
      : access === "directories"
        ? directories.flatMap((directory) => ["--allow-media", directory])
        : []),
  ];
  const command = platform === "windows" ? "cmd" : "npx";
  const server = {
    command,
    args: platform === "windows" ? ["/c", "npx", ...args] : args,
  };
  if (definition.format === "toml") {
    return `[mcp_servers.sequence]\ncommand = ${JSON.stringify(server.command)}\nargs = [\n${server.args.map((arg) => `  ${JSON.stringify(arg)},`).join("\n")}\n]\nstartup_timeout_sec = 60`;
  }
  if (definition.format === "opencode") {
    return JSON.stringify(
      {
        $schema: "https://opencode.ai/config.json",
        mcp: {
          sequence: {
            type: "local",
            command: [server.command, ...server.args],
            enabled: true,
            timeout: 60000,
          },
        },
      },
      null,
      2,
    );
  }
  if (definition.format === "vscode") {
    return JSON.stringify(
      { servers: { sequence: { type: "stdio", ...server } } },
      null,
      2,
    );
  }
  if (definition.format === "copilot") {
    return JSON.stringify(
      { mcpServers: { sequence: { type: "local", ...server, tools: ["*"] } } },
      null,
      2,
    );
  }
  return JSON.stringify({ mcpServers: { sequence: server } }, null, 2);
}
