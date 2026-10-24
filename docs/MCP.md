# AI editing with MCP

Sequence uses a local MCP companion to connect your AI app to the
[GitHub Pages editor](https://alamkanak.github.io/sequence/). No account, repository
clone, npm publication, or local app build is needed by users.

## Install

Install Node.js 24+. Use the configuration in the [README](../README.md) for
clients that accept `mcpServers`, including Claude Desktop and Cursor.
For an app with a server form, choose **local / stdio**, command `npx`, and arguments:

```text
--yes
https://alamkanak.github.io/sequence/mcp/sequence-mcp-0.2.0.tgz
```

Each line is a separate argument. The AI app starts the process; do not also
start another copy in a terminal. `npx` downloads the package and dependencies
into its local cache. Neither Git nor a global npm install is required.

VS Code uses a different JSON wrapper:

```json
{
  "servers": {
    "sequence": {
      "type": "stdio",
      "command": "npx",
      "args": ["--yes", "https://alamkanak.github.io/sequence/mcp/sequence-mcp-0.2.0.tgz"]
    }
  }
}
```

## Connect

1. Ask your agent to call `connect_editor` and show you its link.
2. Open the link in desktop Chrome or Edge. It restores the project saved for
   that website in that browser profile. To use an already-open editor, paste
   the connection link into that tab's address bar.
3. Approve **Connect AI agent** and any browser local-network permission prompt.
4. Keep one connected editor tab open. The agent calls `inspect_project` before editing.

Pairing links expire when the companion stops. The token is removed from the
address bar after reading it. The bridge listens only on `127.0.0.1`, checks the
editor's exact origin and token, and requires browser approval before connecting.
Close the connected tab to disconnect. Use a new link after restarting the agent.

The browser still owns the project, media, previews, and exports. Requested
project data and preview images are sent to your AI client. Download completed
exports from the editor. Browser-only/cloud-only agents without a local connector
cannot use this stdio server.

To let the agent import files, append `"--allow-media", "/absolute/path/to/media"`
to `args`. Repeat for additional directories, or add `"--allow-media-anywhere"`
to permit imports from any directory the companion can read. Imports transfer
binary data directly to the approved editor with no fixed file-size limit. Media
already imported in the connected editor needs no directory permission.

The editor toolbar's **MCP** button shows live connection status. Open it for the
client and companion versions, heartbeat, media access, and request activity, or
to disconnect. Connection messages and other transient notices appear as
dismissible toasts. After disconnecting, request a fresh pairing link to reconnect.

If pairing fails, check that the AI app has started the server, local-network
access is allowed for the site, and no other tab is connected. Remote SSH,
containers, and cloud workspaces run a different localhost: run this server on
the computer where your browser runs.

## Tools

The [generated MCP reference](https://alamkanak.github.io/sequence/docs/mcp/)
documents every parameter, editing operation, response schema, and example using
the same descriptions exposed to agents. Run `npm run dev` and open `/docs/mcp/`
to view it locally. The Pages build regenerates it from `companion/contracts.ts`.

`connect_editor`, `inspect_project`, `manage_assets`, `apply_edits`,
`preview_frame`, `export_video`, `manage_jobs`.

Edits require the inspected revision and an idempotency key. Preview/export use
the same browser renderer as manual editing.

## Maintainers

`npm run build` also builds a small, versioned MCP package under `dist/mcp/`.
The existing Pages workflow publishes it with the app. Push and deploy these
changes before sharing the install URL. No npm registry account is needed.
After changing the package version, update the install URLs in both documents.
`npm run test:mcp:package` verifies installation and pairing security from a clean
temporary directory. The Pages workflow runs this check before publishing.

For development, launch `node companion/server.mjs --editor-url http://127.0.0.1:5173/`.
`--local` instead serves a built `dist/` editor from the companion's own origin;
that origin has separate browser storage. `SEQUENCE_PORT` optionally fixes the
otherwise automatically assigned loopback port.

## Installation methods researched

| Method | Fit for Sequence |
| --- | --- |
| `npx` + HTTPS package | Implemented. Works across local stdio clients; requires Node.js. Hosted alongside the app on Pages. |
| Published npm package | Shorter install command, but requires registry ownership and a release process. Optional later. |
| MCP desktop bundle (`.mcpb`) | Can provide one-click installation with bundled dependencies in supporting desktop apps. Optional later; not a universal client format. |
| Client install links | Can fill in client settings with a click. Each client has its own format; they still need a runnable server. |
| Remote HTTP server | Needs a hosted service and a bridge back to the user's browser. Not provided by static Pages hosting. |

References: [npm execution](https://docs.npmjs.com/cli/v11/commands/npx/),
[HTTPS packages](https://docs.npmjs.com/cli/v11/using-npm/package-spec/#tarballs),
[MCP desktop bundles](https://github.com/modelcontextprotocol/mcpb),
[Cursor install links](https://cursor.com/docs/mcp/install-links),
[VS Code configuration](https://code.visualstudio.com/docs/agents/reference/mcp-configuration),
[browser local-network permissions](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Local_network_access).
