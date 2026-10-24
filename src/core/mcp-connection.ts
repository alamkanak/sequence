import {
  connectionInfoSchema,
  type ConnectionInfo,
} from "../../companion/contracts.ts";
import {
  parseCompanionLink,
  withoutCompanionCredentials,
} from "./companion-link";
import { notifications } from "./notifications";

export type ConnectionStatus =
  "disconnected" | "awaiting-approval" | "connecting" | "connected" | "error";
export interface McpActivity {
  id: string;
  tool: string;
  startedAt: number;
  finishedAt?: number;
  error?: string;
}
export interface ConnectionState {
  status: ConnectionStatus;
  pendingApproval: boolean;
  endpoint: string | null;
  info: ConnectionInfo | null;
  connectedAt: number | null;
  disconnectedAt: number | null;
  lastSeenAt: number | null;
  error: string;
  activity: McpActivity[];
}
let state: ConnectionState = {
  status: "disconnected",
  pendingApproval: false,
  endpoint: null,
  info: null,
  connectedAt: null,
  disconnectedAt: null,
  lastSeenAt: null,
  error: "",
  activity: [],
};
const listeners = new Set<() => void>();
let disconnectCurrent: (() => void) | undefined;
export const mcpConnection = {
  get: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  patch(patch: Partial<ConnectionState>) {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  },
  disconnect() {
    disconnectCurrent?.();
  },
};
export interface MediaTransferContext {
  endpoint: string;
  token: string;
  signal: AbortSignal;
}
type Handler = (
  name: unknown,
  args: unknown,
  context: MediaTransferContext,
) => Promise<unknown>;

/** Socket events own live status. Tokens stay in this closure, outside UI state. */
export function connectCompanion(
  requestApproval: (approve: () => void, decline: () => void) => void,
  handle: Handler,
) {
  let ws: WebSocket | undefined;
  let abort: AbortController | undefined;
  let watchdog: ReturnType<typeof setInterval> | undefined;
  let disposed = false;
  function disconnected(
    message: string,
    tone: "info" | "warning" | "error" = "warning",
  ) {
    abort?.abort();
    clearInterval(watchdog);
    const now = Date.now();
    mcpConnection.patch({
      status: tone === "error" ? "error" : "disconnected",
      pendingApproval: false,
      disconnectedAt: now,
      error: message,
      activity: state.activity.map((item) =>
        item.finishedAt
          ? item
          : { ...item, finishedAt: now, error: "Editor disconnected" },
      ),
    });
    if (!disposed) notifications.show(message, { id: "mcp-connection", tone });
  }
  const disconnect = () => {
    const socket = ws;
    ws = undefined;
    disconnected(
      "AI agent disconnected. Ask your agent for a new pairing link to reconnect.",
      "info",
    );
    socket?.close();
  };
  disconnectCurrent = disconnect;
  const offerConnection = () => {
    try {
      const pairing = parseCompanionLink(location.href);
      if (!pairing) return;
      history.replaceState(
        history.state,
        "",
        withoutCompanionCredentials(location.href),
      );
      mcpConnection.patch({
        pendingApproval: true,
        ...(ws?.readyState === WebSocket.OPEN
          ? {}
          : {
              status: "awaiting-approval",
              endpoint: pairing.endpoint,
              error: "",
            }),
      });
      requestApproval(
        () => {
          if (disposed) return;
          const open = () => {
            if (disposed) return;
            abort?.abort();
            clearInterval(watchdog);
            abort = new AbortController();
            const controller = abort;
            mcpConnection.patch({
              status: "connecting",
              pendingApproval: false,
              endpoint: pairing.endpoint,
              info: null,
              connectedAt: null,
              disconnectedAt: null,
              lastSeenAt: null,
              error: "",
              activity: [],
            });
            let socket: WebSocket;
            try {
              socket = new WebSocket(
                `${pairing.endpoint}?token=${pairing.token}`,
              );
            } catch {
              disconnected(
                "Could not connect to the local MCP companion. Check browser local-network permissions and ask your agent for a new link.",
                "error",
              );
              return;
            }
            ws = socket;
            let lastSeen = Date.now();
            watchdog = setInterval(() => {
              if (ws !== socket) return;
              if (Date.now() - lastSeen > 7000) {
                ws = undefined;
                disconnected(
                  "MCP companion stopped responding. Ask your agent for a new pairing link.",
                );
                socket.close();
              }
            }, 1000);
            socket.onopen = () => {
              if (ws === socket) lastSeen = Date.now();
            };
            socket.onmessage = async (event) => {
              if (ws !== socket || disposed) return;
              let message;
              try {
                message = JSON.parse(event.data);
              } catch {
                return;
              }
              if (!message || typeof message !== "object") return;
              lastSeen = Date.now();
              mcpConnection.patch({ lastSeenAt: lastSeen });
              if (message.type === "connection") {
                const info = connectionInfoSchema.safeParse(message.info);
                if (!info.success) {
                  ws = undefined;
                  disconnected(
                    "MCP companion sent incompatible connection details. Update and restart the companion.",
                    "error",
                  );
                  socket.close();
                  return;
                }
                mcpConnection.patch({
                  status: "connected",
                  info: info.data,
                  connectedAt: Date.now(),
                  error: "",
                });
                notifications.show("AI agent connected to this project.", {
                  id: "mcp-connection",
                  tone: "success",
                });
                return;
              }
              if (message.type === "heartbeat") return;
              if (
                typeof message.id !== "string" ||
                typeof message.tool !== "string"
              )
                return;
              const { id, tool, args } = message;
              mcpConnection.patch({
                activity: [
                  { id, tool, startedAt: Date.now() },
                  ...state.activity,
                ].slice(0, 20),
              });
              // Keep long transfers and browser processing alive without imposing a
              // size-dependent timeout. Disconnect aborts all active fetches.
              const progress = setInterval(() => {
                if (ws === socket && socket.readyState === WebSocket.OPEN)
                  socket.send(JSON.stringify({ id, type: "progress" }));
              }, 10000);
              let error: string | undefined;
              try {
                const result = await handle(tool, args, {
                  ...pairing,
                  signal: controller.signal,
                });
                if (ws === socket && socket.readyState === WebSocket.OPEN)
                  socket.send(JSON.stringify({ id, result }));
              } catch (reason) {
                error =
                  reason instanceof Error ? reason.message : String(reason);
                if (ws === socket && socket.readyState === WebSocket.OPEN)
                  socket.send(JSON.stringify({ id, error }));
              } finally {
                clearInterval(progress);
                if (ws === socket)
                  mcpConnection.patch({
                    activity: state.activity.map((item) =>
                      item.id === id
                        ? { ...item, finishedAt: Date.now(), error }
                        : item,
                    ),
                  });
              }
            };
            socket.onerror = () => {
              if (ws !== socket || disposed) return;
              ws = undefined;
              disconnected(
                "Could not reach the MCP companion. Check local-network access and that only one editor tab is connected.",
                "error",
              );
              socket.close();
            };
            socket.onclose = () => {
              if (ws === socket && !disposed) {
                ws = undefined;
                disconnected(
                  "MCP disconnected. Ask your agent for a new pairing link.",
                );
              }
            };
          };
          if (ws && ws.readyState !== WebSocket.CLOSED) {
            const old = ws;
            ws = undefined;
            abort?.abort();
            clearInterval(watchdog);
            mcpConnection.patch({
              status: "connecting",
              pendingApproval: false,
            });
            old.addEventListener("close", open, { once: true });
            old.close();
          } else open();
        },
        () => {
          mcpConnection.patch({
            pendingApproval: false,
            status:
              ws?.readyState === WebSocket.OPEN ? "connected" : "disconnected",
          });
        },
      );
    } catch (error) {
      const old = ws;
      ws = undefined;
      disconnected(
        error instanceof Error ? error.message : String(error),
        "error",
      );
      old?.close();
    }
  };
  window.addEventListener("hashchange", offerConnection);
  offerConnection();
  return () => {
    disposed = true;
    window.removeEventListener("hashchange", offerConnection);
    if (disconnectCurrent === disconnect) disconnectCurrent = undefined;
    abort?.abort();
    clearInterval(watchdog);
    const old = ws;
    ws = undefined;
    old?.close();
    mcpConnection.patch({
      status: "disconnected",
      pendingApproval: false,
      disconnectedAt: Date.now(),
      activity: state.activity.map((item) =>
        item.finishedAt
          ? item
          : { ...item, finishedAt: Date.now(), error: "Editor disconnected" },
      ),
    });
  };
}
