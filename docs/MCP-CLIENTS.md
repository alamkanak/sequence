# MCP client setup sources

Checked October 24, 2026. The docs setup panel uses each client's documented
local stdio format. These are configuration references, not claims that every
client or operating system was installed and tested.

| Client                              | Configuration                                                                    | Official reference                                                                                 |
| ----------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Codex                               | `.codex/config.toml` or `~/.codex/config.toml`; `[mcp_servers.sequence]`         | [OpenAI](https://developers.openai.com/codex/mcp)                                                  |
| Claude Code                         | Project `.mcp.json`; `mcpServers`                                                | [Claude Code](https://code.claude.com/docs/en/mcp)                                                 |
| Cursor                              | `.cursor/mcp.json` or `~/.cursor/mcp.json`; `mcpServers`                         | [Cursor](https://cursor.com/docs/mcp)                                                              |
| VS Code Copilot                     | `.vscode/mcp.json`; `servers` and `type: stdio`                                  | [VS Code](https://code.visualstudio.com/docs/agents/reference/mcp-configuration)                   |
| Copilot CLI / shared Copilot config | `~/.copilot/mcp-config.json` or project `.mcp.json`; `mcpServers`, `type: local` | [GitHub](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers) |
| Gemini CLI                          | `.gemini/settings.json` or `~/.gemini/settings.json`; `mcpServers`               | [Gemini CLI](https://geminicli.com/docs/tools/mcp-server/)                                         |
| Windsurf / Devin Desktop            | Open Cascade's raw `mcp_config.json`; `mcpServers`                               | [Devin Desktop](https://docs.devin.ai/desktop/cascade/mcp)                                         |
| Cline                               | MCP Servers → Configure → Configure MCP Servers; `mcpServers`                    | [Cline](https://docs.cline.bot/mcp/mcp-overview)                                                   |
| Roo Code                            | `.roo/mcp.json`; `mcpServers`                                                    | [Roo Code](https://roocodeinc.github.io/Roo-Code/features/mcp/using-mcp-in-roo/)                   |
| OpenCode                            | `opencode.json`; `mcp`, `type: local`, executable and arguments in `command`     | [OpenCode](https://opencode.ai/docs/mcp-servers/)                                                  |
| Kiro                                | `.kiro/settings/mcp.json` or `~/.kiro/settings/mcp.json`; `mcpServers`           | [Kiro](https://kiro.dev/docs/mcp/configuration/)                                                   |
| Claude Desktop                      | Developer → Edit Config; `claude_desktop_config.json`, `mcpServers`              | [MCP local-server guide](https://modelcontextprotocol.io/docs/develop/connect-local-servers)       |

VS Code still supports its workspace format for compatibility; newer setup flows
prefer the portable Copilot format. The setup panel explains both. The Windsurf
documentation now redirects to Devin Desktop; opening the app's config avoids
assuming an old installation uses the new storage location.

`src/docs/client-configs.ts` defines client metadata and generates the snippets.
The package version comes from the same generated catalog as the tool reference.
Every format uses the same argument list: repeat `--allow-media` with existing
absolute directories, use `--allow-media-anywhere` without a path, or omit both
to disable agent imports. The Windows option launches `npx` through `cmd /c`.
JSON remains valid JSON; explanatory permission text is next to the code rather
than inserted as invalid JSON comments.

Sequence requires the companion and approved browser on the same computer.
Cloud-only sessions cannot reach its loopback bridge. MCP server or media-access
changes require restarting the companion connection and pairing again.
