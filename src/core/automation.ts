import { store } from "./store";
import { validateProject, type Edit } from "./model";
import { transport } from "../engine/transport";
import { assetFiles } from "../engine/client";
import { exports } from "../engine/export";
import { addAsset, importFiles } from "./actions";
import { canEncodeVideo, canEncodeAudio } from "mediabunny";
import { elementManifest } from "../engine/elements";
import {
  parseCompanionLink,
  withoutCompanionCredentials,
} from "./companion-link";
const receipts = new Map<string, unknown>();
export async function handleTool(name: string, args: Record<string, any>) {
  const p = store.get().project;
  if (name === "inspect_project") {
    return {
      project: p,
      missingAssets: p.assets
        .filter((a) => !assetFiles.has(a.id))
        .map((a) => a.id),
      capabilities: {
        elements: elementManifest(),
        animations: ["none", "fade", "slide", "zoom"],
        keyframeProperties: ["x", "y", "scale", "rotation", "opacity"],
        sdrOnly: true,
        video: {
          avc: await canEncodeVideo("avc", {
            width: p.width,
            height: p.height,
          }),
          vp9: await canEncodeVideo("vp9", {
            width: p.width,
            height: p.height,
          }),
        },
        audio: {
          aac: await canEncodeAudio("aac"),
          opus: await canEncodeAudio("opus"),
        },
      },
    };
  }
  if (name === "apply_edits") {
    if (
      typeof args.idempotencyKey !== "string" ||
      typeof args.expectedRevision !== "number"
    )
      throw new Error("expectedRevision and idempotencyKey are required");
    if (receipts.has(args.idempotencyKey))
      return receipts.get(args.idempotencyKey);
    if (args.expectedRevision !== p.revision)
      throw new Error("Revision conflict; inspect the project again");
    if (!Array.isArray(args.operations) || args.operations.length > 500)
      throw new Error("Supply at most 500 typed operations");
    if (
      args.operations.length === 1 &&
      ["undo", "redo"].includes(args.operations[0].op)
    ) {
      if (!args.validateOnly) {
        args.operations[0].op === "undo" ? store.undo() : store.redo();
      }
      const result = {
        revision: store.get().project.revision,
        applied: !args.validateOnly,
      };
      if (!args.validateOnly) receipts.set(args.idempotencyKey, result);
      return result;
    }
    const allowed = [
      "project",
      "add_track",
      "update_track",
      "delete_track",
      "add_clip",
      "update_clip",
      "delete_clip",
      "delete_asset",
      "split",
      "transition",
    ];
    for (const op of args.operations)
      if (!allowed.includes(op.op))
        throw new Error(`Unsupported operation: ${op.op}`);
    const next = store.apply(
      args.operations as Edit[],
      args.expectedRevision,
      !!args.validateOnly,
    );
    const result = {
      revision: next.revision,
      projectId: next.id,
      validated: true,
      applied: !args.validateOnly,
    };
    if (!args.validateOnly) {
      receipts.set(args.idempotencyKey, result);
      if (receipts.size > 200) receipts.delete(receipts.keys().next().value!);
    }
    return result;
  }
  if (name === "manage_assets") {
    if (args.action === "list") return p.assets;
    if (args.action === "place") {
      if (!assetFiles.has(args.assetId))
        throw new Error("Asset must be imported or relinked first");
      addAsset(args.assetId, args.trackId, args.start);
      return { revision: store.get().project.revision };
    }
    if (args.action === "import") {
      if (!Array.isArray(args.files))
        throw new Error(
          "The companion must provide explicitly allowed local files",
        );
      const imported: File[] = [];
      for (const item of args.files) {
        if (item.data.length > 96 * 1024 * 1024)
          throw new Error("Import large media through the browser file picker");
        const bytes = Uint8Array.from(atob(item.data), (c) => c.charCodeAt(0));
        imported.push(new File([bytes], item.name, { type: item.type }));
      }
      await importFiles(imported);
      return store.get().project.assets;
    }
    throw new Error("Use list, place, or import");
  }
  if (name === "preview_frame") {
    if (!transport.engine) throw new Error("Open the editor before previewing");
    transport.seek(Number(args.time) || 0);
    while (transport.engine.busy) await new Promise((r) => setTimeout(r, 10));
    await transport.engine.draw(transport.time, true);
    return {
      time: transport.time,
      dataUrl: await transport.engine.client.call("snapshot"),
    };
  }
  if (name === "export_video") {
    const settings = {
      name: p.name,
      width: p.width,
      height: p.height,
      fps: p.fps,
      bitrate: 8000000,
      format: "mp4" as const,
      audio: true,
      allowToneMap: false,
      ...args.settings,
    };
    if (
      !["mp4", "webm"].includes(settings.format) ||
      !Number.isFinite(settings.width) ||
      settings.width < 16 ||
      settings.width > 7680 ||
      settings.width % 2 ||
      settings.height < 16 ||
      settings.height > 7680 ||
      settings.height % 2 ||
      settings.fps < 1 ||
      settings.fps > 120 ||
      settings.bitrate < 100000 ||
      settings.bitrate > 100000000
    )
      throw new Error("Invalid export settings");
    return { jobId: exports.start(p, settings) };
  }
  if (name === "manage_jobs") {
    const job = exports.get();
    if (args.jobId && job.id !== args.jobId) throw new Error("Unknown job");
    if (args.action === "cancel") exports.cancel();
    const { blob, url, ...result } = exports.get();
    return { ...result, bytes: blob?.size, downloadAvailable: !!url };
  }
  throw new Error(`Unknown tool: ${name}`);
}
export function connectCompanion(
  requestApproval: (connect: () => void) => void,
) {
  let ws: WebSocket | undefined;
  let disposed = false;
  const offerConnection = () => {
    try {
      const pairing = parseCompanionLink(location.href);
      if (!pairing) return;
      history.replaceState(
        history.state,
        "",
        withoutCompanionCredentials(location.href),
      );
      requestApproval(() => {
        const open = () => {
          if (disposed) return;
          try {
            const socket = new WebSocket(
              `${pairing.endpoint}?token=${pairing.token}`,
            );
            ws = socket;
            socket.onmessage = async (e) => {
              let id: string | undefined;
              try {
                const m = JSON.parse(e.data);
                id = m.id;
                const result = await handleTool(m.tool, m.args);
                if (socket.readyState === WebSocket.OPEN)
                  socket.send(JSON.stringify({ id, result }));
              } catch (error) {
                if (id && socket.readyState === WebSocket.OPEN)
                  socket.send(
                    JSON.stringify({
                      id,
                      error:
                        error instanceof Error ? error.message : String(error),
                    }),
                  );
              }
            };
            socket.onopen = () => {
              if (ws === socket)
                store.patch({
                  error:
                    "AI agent connected to this project. Close this tab to disconnect.",
                });
            };
            socket.onclose = () => {
              if (ws === socket && !disposed)
                store.patch({
                  error:
                    "MCP disconnected. Ask your agent for a new connection link; allow local network access if prompted and connect only one tab.",
                });
            };
          } catch {
            store.patch({
              error:
                "Could not connect to the local MCP companion. Use desktop Chrome or Edge and allow local network access for this site.",
            });
          }
        };
        if (ws && ws.readyState !== WebSocket.CLOSED) {
          const old = ws;
          ws = undefined;
          old.addEventListener("close", open, { once: true });
          old.close();
        } else open();
      });
    } catch (error) {
      store.patch({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };
  window.addEventListener("hashchange", offerConnection);
  offerConnection();
  return () => {
    disposed = true;
    window.removeEventListener("hashchange", offerConnection);
    ws?.close();
  };
}
