import { store } from "./store";
import {
  parseBrowserRequest,
  type ToolOutput,
} from "../../companion/contracts.ts";
import { transport } from "../engine/transport";
import { assetFiles } from "../engine/client";
import { exports } from "../engine/export";
import { addAsset, importFiles } from "./actions";
import { canEncodeVideo, canEncodeAudio } from "mediabunny";
import { elementManifest } from "../engine/elements";
import { receiveMedia } from "./mcp-media";
import type { MediaTransferContext } from "./mcp-connection";
const receipts = new Map<string, ToolOutput<"apply_edits">>();
export async function handleTool(
  toolName: unknown,
  input: unknown,
  transfer?: MediaTransferContext,
) {
  const { name, args } = parseBrowserRequest(toolName, input);
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
    if (receipts.has(args.idempotencyKey))
      return receipts.get(args.idempotencyKey);
    if (args.expectedRevision !== p.revision)
      throw new Error("Revision conflict; inspect the project again");
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
    const edits = args.operations.filter(
      (op) => op.op !== "undo" && op.op !== "redo",
    );
    const next = store.apply(edits, args.expectedRevision, !!args.validateOnly);
    const result = {
      revision: next.revision,
      projectId: next.id,
      validated: true as const,
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
      const imported: File[] = [];
      for (const item of args.files) {
        if (!transfer)
          throw new Error("An approved MCP connection is required for imports");
        imported.push(await receiveMedia(item, transfer));
      }
      transfer?.signal.throwIfAborted();
      const result = await importFiles(imported, transfer?.signal);
      if (result.failed)
        throw new Error(
          store.get().error || "Some files could not be imported",
        );
      return store.get().project.assets;
    }
    throw new Error("Use list, place, or import");
  }
  if (name === "preview_frame") {
    if (!transport.engine) throw new Error("Open the editor before previewing");
    transport.seek(args.time);
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
