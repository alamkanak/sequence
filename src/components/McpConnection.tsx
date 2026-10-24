import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { mcpConnection, type ConnectionStatus } from "../core/mcp-connection";
import { useStore } from "../core/store";
import { Button, Modal, cn, skin } from "./ui";

const labels: Record<ConnectionStatus, string> = {
  disconnected: "Disconnected",
  "awaiting-approval": "Awaiting approval",
  connecting: "Connecting",
  connected: "Connected",
  error: "Connection failed",
};
function Dot({ status }: { status: ConnectionStatus }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "size-2 shrink-0 rounded-full",
        status === "connected"
          ? "bg-emerald-500"
          : status === "connecting" || status === "awaiting-approval"
            ? "animate-pulse bg-amber-500 motion-reduce:animate-none"
            : status === "error"
              ? "bg-red-500"
              : "bg-zinc-400",
      )}
    />
  );
}
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-4 py-3 text-xs leading-6">
      <dt className={skin.muted}>{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}
const time = (value: number | null) =>
  value ? new Date(value).toLocaleTimeString() : "—";

export function McpConnection() {
  const connection = useSyncExternalStore(
    mcpConnection.subscribe,
    mcpConnection.get,
  );
  const { project } = useStore();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!open) return;
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [open]);
  const { status, info } = connection;
  const active = connection.activity.filter((item) => !item.finishedAt);
  return (
    <>
      <Button
        aria-label={`MCP connection: ${labels[status]}`}
        title={`MCP connection: ${labels[status]}`}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="mx-1 h-9 gap-2 px-2"
      >
        <Dot status={status} />
        <span>MCP</span>
        <span className={cn("hidden xl:inline", skin.muted)}>
          {labels[status]}
        </span>
      </Button>
      {open && (
        <Modal title="MCP connection" onClose={() => setOpen(false)}>
          <div className="space-y-5">
            <div
              className={cn("rounded-xl border p-4", skin.border, skin.panel)}
            >
              <p
                role="status"
                className="flex items-center gap-2 text-sm font-semibold"
              >
                <Dot status={status} />
                {labels[status]}
              </p>
              <p className={cn("mt-2 text-xs leading-6", skin.muted)}>
                {status === "connected"
                  ? "Your agent can work with this browser-local project. This panel updates as activity happens."
                  : connection.error ||
                    (status === "awaiting-approval"
                      ? "Approve the pairing request to connect your AI agent."
                      : status === "connecting"
                        ? "Opening the approved connection to your local companion…"
                        : "Ask your agent to call connect_editor, then open its pairing link and approve access.")}
              </p>
            </div>
            <dl
              className={cn(
                "divide-y divide-zinc-200 [[data-theme=dark]_&]:divide-white/[0.08]",
                skin.border,
              )}
            >
              <Row label="Project">
                {project.name}
                <span className={cn("block font-mono text-[10px]", skin.muted)}>
                  {project.id} · revision {project.revision}
                </span>
              </Row>
              <Row label="AI client">
                {info?.client
                  ? `${info.client.name} · ${info.client.version}`
                  : "Not identified"}
              </Row>
              <Row label="Companion">
                {info
                  ? `${info.serverName} · v${info.serverVersion}`
                  : "Not connected"}
              </Row>
              <Row label="Endpoint">
                <code className="break-all">
                  {connection.endpoint ?? "No pairing link opened"}
                </code>
              </Row>
              <Row label="Transport">
                Local WebSocket · agent uses MCP over stdio
              </Row>
              <Row label="Connected at">
                {time(connection.connectedAt)}
                {status === "connected" && connection.connectedAt && (
                  <span className={cn("ml-2", skin.muted)}>
                    (
                    {Math.max(
                      0,
                      Math.floor((now - connection.connectedAt) / 1000),
                    )}
                    s)
                  </span>
                )}
              </Row>
              <Row label="Last heartbeat">{time(connection.lastSeenAt)}</Row>
              {connection.disconnectedAt && (
                <Row label="Disconnected at">
                  {time(connection.disconnectedAt)}
                </Row>
              )}
              <Row label="Media imports">
                {info?.mediaAccess.mode === "anywhere" ? (
                  "Any readable directory"
                ) : info?.mediaAccess.mode === "directories" ? (
                  <ul className="space-y-1">
                    {info.mediaAccess.directories.map((dir) => (
                      <li key={dir} className="font-mono text-[11px] break-all">
                        {dir}
                      </li>
                    ))}
                  </ul>
                ) : info ? (
                  "Agent file imports disabled. Import files in the editor or restart the companion with --allow-media or --allow-media-anywhere."
                ) : (
                  "Available after connecting"
                )}
              </Row>
              <Row label="Active requests">
                {status === "connected"
                  ? active.length
                    ? active.map((item) => item.tool).join(", ")
                    : "None · ready"
                  : "None"}
              </Row>
            </dl>
            <section aria-label="Recent MCP activity">
              <h3 className="text-xs font-semibold">Recent activity</h3>
              {!connection.activity.length ? (
                <p className={cn("mt-2 text-xs leading-6", skin.muted)}>
                  Tool requests will appear here as your agent works.
                </p>
              ) : (
                <ol className="mt-3 max-h-44 space-y-3 overflow-y-auto">
                  {connection.activity.map((item) => (
                    <li
                      key={item.id}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-xs",
                        skin.border,
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <code>{item.tool}</code>
                        <span
                          className={
                            item.error
                              ? "text-red-600 [[data-theme=dark]_&]:text-red-400"
                              : skin.muted
                          }
                        >
                          {item.error
                            ? "Failed"
                            : item.finishedAt
                              ? "Complete"
                              : "Running"}{" "}
                          ·{" "}
                          {Math.max(
                            0,
                            ((item.finishedAt ?? now) - item.startedAt) / 1000,
                          ).toFixed(1)}
                          s
                        </span>
                      </div>
                      {item.error && (
                        <p
                          className={cn(
                            "mt-2 leading-5 break-words",
                            skin.muted,
                          )}
                        >
                          {item.error}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </section>
            <div className="flex justify-end gap-2">
              {(status === "connected" || status === "connecting") && (
                <Button
                  variant="danger"
                  onClick={() => mcpConnection.disconnect()}
                >
                  Disconnect agent
                </Button>
              )}
              <Button onClick={() => setOpen(false)}>Done</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
