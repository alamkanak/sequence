import { describe, expect, it } from "vitest";
import {
  clientConfiguration,
  mcpClients,
  type McpClientId,
  type MediaAccess,
} from "../src/docs/client-configs";

// Decode the client formats to check the actual executable and arguments,
// rather than comparing formatting or duplicating generator snapshots.
function serverCommand(client: McpClientId, code: string): string[] {
  if (client === "codex") {
    expect(code).toContain("[mcp_servers.sequence]");
    return [
      JSON.parse(code.match(/^command = (.+)$/m)![1]),
      ...JSON.parse(
        code.match(/args = (\[[\s\S]*?\n\])/m)![1].replace(/,\s*\]/, "]"),
      ),
    ];
  }
  const config = JSON.parse(code);
  if (client === "opencode") {
    expect(config.mcp.sequence.type).toBe("local");
    expect(config.mcp.sequence.enabled).toBe(true);
    return config.mcp.sequence.command;
  }
  const server = (client === "vscode" ? config.servers : config.mcpServers)
    .sequence;
  if (client === "vscode") expect(server.type).toBe("stdio");
  if (client === "copilot-cli") {
    expect(server.type).toBe("local");
    expect(server.tools).toEqual(["*"]);
  }
  return [server.command, ...server.args];
}

describe.each(mcpClients)("$name configuration", (client) => {
  const version = "1.2.3";
  const packageUrl = `https://alamkanak.github.io/sequence/mcp/sequence-mcp-${version}.tgz`;

  it("preserves multiple scoped paths, spaces, quotes, and backslashes", () => {
    const paths = [
      "/Users/test/My Clips",
      '/media/A "quoted" folder',
      "C:\\Users\\test\\Videos",
    ];
    const command = serverCommand(
      client.id,
      clientConfiguration(client.id, version, "directories", paths, "unix"),
    );
    expect(command).toEqual([
      "npx",
      "--yes",
      packageUrl,
      "--allow-media",
      paths[0],
      "--allow-media",
      paths[1],
      "--allow-media",
      paths[2],
    ]);
  });

  it.each(["anywhere", "none"] as const)(
    "uses %s access without leaking directory arguments",
    (access: MediaAccess) => {
      const command = serverCommand(
        client.id,
        clientConfiguration(
          client.id,
          version,
          access,
          ["/should/not/appear"],
          "unix",
        ),
      );
      expect(command).toEqual([
        "npx",
        "--yes",
        packageUrl,
        ...(access === "anywhere" ? ["--allow-media-anywhere"] : []),
      ]);
    },
  );

  it("launches npx through cmd on Windows without changing permission arguments", () => {
    const command = serverCommand(
      client.id,
      clientConfiguration(
        client.id,
        version,
        "directories",
        ["C:\\Users\\you\\My Videos"],
        "windows",
      ),
    );
    expect(command).toEqual([
      "cmd",
      "/c",
      "npx",
      "--yes",
      packageUrl,
      "--allow-media",
      "C:\\Users\\you\\My Videos",
    ]);
  });
});
