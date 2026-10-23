export type CompanionLink = { endpoint: string; token: string };

export function parseCompanionLink(href: string): CompanionLink | null {
  const page = new URL(href);
  const params = new URLSearchParams(page.hash.split("?")[1] || "");
  const token = params.get("token");
  const bridge = params.get("bridge");
  if (!token && !bridge) return null;
  if (!token || !/^[a-f0-9]{48}$/.test(token))
    throw new Error(
      "Invalid MCP pairing token. Ask your agent for a new connection link.",
    );
  const endpoint = new URL(
    bridge ||
      (["localhost", "127.0.0.1"].includes(page.hostname)
        ? `ws://127.0.0.1:${page.port}/bridge`
        : "about:blank"),
  );
  if (
    endpoint.protocol !== "ws:" ||
    endpoint.hostname !== "127.0.0.1" ||
    !endpoint.port ||
    endpoint.port === "0" ||
    endpoint.pathname !== "/bridge" ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash
  )
    throw new Error(
      "MCP pairing must connect to a loopback companion on this computer.",
    );
  return { endpoint: endpoint.href, token };
}

export function withoutCompanionCredentials(href: string): string {
  const page = new URL(href);
  const [route, query] = page.hash.slice(1).split("?");
  const params = new URLSearchParams(query);
  params.delete("token");
  params.delete("bridge");
  page.hash = route + (params.size ? `?${params}` : "");
  return page.href;
}
