import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { connectCompanion, mcpConnection } from "../src/core/mcp-connection";
import { notifications } from "../src/core/notifications";

const token = "a".repeat(48);
const endpoint = "ws://127.0.0.1:4321/bridge";
const info = {
  serverName: "sequence-editor",
  serverVersion: "0.1.0",
  client: { name: "test-agent", version: "1" },
  mediaAccess: { mode: "anywhere", directories: [] },
};
class Socket extends EventTarget {
  static OPEN = 1;
  static CLOSED = 3;
  static instances: Socket[] = [];
  readyState = 0;
  onopen?: () => void;
  onclose?: () => void;
  onerror?: () => void;
  onmessage?: (event: { data: string }) => Promise<void>;
  send = vi.fn();
  constructor(public url: string) {
    super();
    Socket.instances.push(this);
  }
  close() {
    this.readyState = 3;
    this.onclose?.();
    this.dispatchEvent(new Event("close"));
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  message(value: unknown) {
    return this.onmessage?.({ data: JSON.stringify(value) });
  }
}
let dispose: (() => void) | undefined;
beforeEach(() => {
  vi.useFakeTimers();
  Socket.instances = [];
  vi.stubGlobal("WebSocket", Socket);
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("location", {
    href: `http://127.0.0.1:5173/#/editor?${new URLSearchParams({ bridge: endpoint, token })}`,
  });
  vi.stubGlobal("history", {
    replaceState: vi.fn((_state, _title, href) => {
      location.href = href;
    }),
  });
  mcpConnection.patch({
    status: "disconnected",
    pendingApproval: false,
    endpoint: null,
    info: null,
    connectedAt: null,
    disconnectedAt: null,
    lastSeenAt: null,
    error: "",
    activity: [],
  });
  notifications.get().forEach((item) => notifications.dismiss(item.id));
});
afterEach(() => {
  dispose?.();
  dispose = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
function approve(
  handler: Parameters<typeof connectCompanion>[1] = vi.fn(async () => ({
    revision: 1,
  })),
) {
  dispose = connectCompanion((connect) => connect(), handler);
  const socket = Socket.instances[0];
  socket.open();
  return socket;
}

describe("live MCP connection", () => {
  it("waits for approval, sanitizes the URL, and never exposes credentials in status", async () => {
    const approval = vi.fn();
    dispose = connectCompanion(approval, vi.fn());
    expect(Socket.instances).toHaveLength(0);
    expect(mcpConnection.get().status).toBe("awaiting-approval");
    expect(location.href).not.toContain(token);
    const connect = approval.mock.calls[0][0];
    connect();
    const socket = Socket.instances[0];
    socket.open();
    expect(mcpConnection.get().status).toBe("connecting");
    await socket.message({ type: "connection", info });
    expect(mcpConnection.get().status).toBe("connected");
    expect(mcpConnection.get().info).toEqual(info);
    expect(JSON.stringify(mcpConnection.get())).not.toContain(token);
    expect(notifications.get()[0].message).toBe(
      "AI agent connected to this project.",
    );
  });
  it("declines without opening a socket", () => {
    dispose = connectCompanion((_approve, decline) => decline(), vi.fn());
    expect(mcpConnection.get().status).toBe("disconnected");
    expect(Socket.instances).toHaveLength(0);
  });
  it("closes the old socket if a new malformed pairing fails", async () => {
    const socket = approve();
    await socket.message({ type: "connection", info });
    location.href = "http://127.0.0.1:5173/#/editor?token=invalid";
    window.dispatchEvent(new Event("hashchange"));
    expect(mcpConnection.get().status).toBe("error");
    expect(socket.readyState).toBe(Socket.CLOSED);
  });
  it("records requests and updates disconnected state immediately on close", async () => {
    const socket = approve();
    await socket.message({ type: "connection", info });
    await socket.message({
      id: "request-1",
      tool: "inspect_project",
      args: {},
    });
    expect(mcpConnection.get().activity[0].finishedAt).toBeDefined();
    socket.close();
    expect(mcpConnection.get().status).toBe("disconnected");
    expect(mcpConnection.get().disconnectedAt).toBe(Date.now());
    expect(notifications.get()).toHaveLength(1);
    expect(notifications.get()[0].message).toContain("MCP disconnected");
  });
  it("aborts an active transfer on disconnect and marks the request failed", async () => {
    let complete!: () => void;
    const handler = vi.fn((_name, _args, context) => {
      expect(context.signal.aborted).toBe(false);
      return new Promise<void>((resolve) => {
        complete = resolve;
      });
    });
    const socket = approve(handler);
    await socket.message({ type: "connection", info });
    const request = socket.message({
      id: "import-1",
      tool: "manage_assets",
      args: {},
    });
    mcpConnection.disconnect();
    expect(handler.mock.calls[0][2].signal.aborted).toBe(true);
    expect(mcpConnection.get().activity[0].error).toBe("Editor disconnected");
    complete();
    await request;
    expect(socket.send).not.toHaveBeenCalled();
  });
  it("keeps healthy connections live, detects a silent companion, and handles socket errors", async () => {
    const socket = approve();
    await socket.message({ type: "connection", info });
    vi.advanceTimersByTime(5000);
    await socket.message({ type: "heartbeat" });
    vi.advanceTimersByTime(5000);
    expect(mcpConnection.get().status).toBe("connected");
    vi.advanceTimersByTime(3000);
    expect(mcpConnection.get().status).toBe("disconnected");
    expect(mcpConnection.get().error).toContain("stopped responding");
  });
  it("rejects incompatible metadata and does not reopen on late events after disposal", async () => {
    const socket = approve();
    await socket.message({ type: "connection", info: {} });
    expect(mcpConnection.get().status).toBe("error");
    dispose?.();
    await socket.message({ type: "connection", info });
    expect(mcpConnection.get().status).toBe("disconnected");
  });
});
