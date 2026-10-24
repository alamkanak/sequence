import { describe, expect, it } from "vitest";
import {
  tools,
  operationSchemas,
  parseBrowserRequest,
  projectOutputSchema,
} from "../companion/contracts.ts";
import { docsCatalog } from "../companion/docs-catalog.ts";
import { emptyProject, newClip } from "../src/core/model";

const batch = (operations: unknown[]) => ({
  expectedRevision: 0,
  idempotencyKey: "test-batch",
  operations,
});

describe("MCP contracts", () => {
  it("documents every parameter and publishes only valid request examples", () => {
    const catalog = docsCatalog();
    expect(catalog.tools).toHaveLength(7);
    expect(
      catalog.tools.find((tool) => tool.name === "apply_edits")?.variants,
    ).toHaveLength(12);
    for (const tool of catalog.tools) {
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.outputSchema.type).toBe("object");
      expect(tool.description.length).toBeGreaterThan(80);
    }
  });

  it("requires action-specific inputs and rejects unrelated fields", () => {
    expect(
      tools.manage_assets.input.safeParse({ action: "place" }).success,
    ).toBe(false);
    expect(
      tools.manage_assets.input.safeParse({ action: "import", paths: [] })
        .success,
    ).toBe(false);
    expect(
      tools.manage_assets.input.safeParse({ action: "list", assetId: "asset" })
        .success,
    ).toBe(false);
    expect(
      tools.manage_assets.input.safeParse({ action: "import", files: [] })
        .success,
    ).toBe(false);
    expect(
      tools.manage_jobs.input.safeParse({ action: "cancel" }).success,
    ).toBe(false);
    expect(tools.manage_jobs.input.parse({})).toEqual({ action: "status" });
  });

  it("validates every editing operation, including deep nested properties", () => {
    const project = emptyProject();
    const clip = newClip(project, "text", project.tracks[0].id);
    expect(
      tools.apply_edits.input.safeParse(batch([{ op: "add_clip", clip }]))
        .success,
    ).toBe(true);
    for (const operation of [
      { op: "split", id: clip.id },
      { op: "split", id: clip.id, time: "2" },
      { op: "split", id: clip.id, time: 2, extra: true },
      { op: "update_clip", id: clip.id, patch: { id: "different" } },
      {
        op: "update_track",
        id: project.tracks[0].id,
        patch: { arbitrary: true },
      },
      { op: "project", patch: { revision: 12 } },
      {
        op: "update_clip",
        id: clip.id,
        patch: { volumeKeyframes: [{ time: 0, value: 1, extra: true }] },
      },
      {
        op: "update_clip",
        id: clip.id,
        patch: {
          fillGradient: {
            type: "linear",
            angle: 0,
            stops: [
              { offset: 0, color: "#000000", opacity: 1 },
              { offset: 1, color: "#ffffff", opacity: 1, extra: true },
            ],
          },
        },
      },
    ])
      expect(
        tools.apply_edits.input.safeParse(batch([operation])).success,
        JSON.stringify(operation),
      ).toBe(false);
  });

  it("requires standalone undo/redo and a nonempty bounded regular batch", () => {
    for (const operations of [
      [],
      [{ op: "undo" }, { op: "redo" }],
      [{ op: "undo" }, { op: "project", patch: { name: "test" } }],
      Array.from({ length: 501 }, () => ({
        op: "project",
        patch: { name: "test" },
      })),
    ])
      expect(tools.apply_edits.input.safeParse(batch(operations)).success).toBe(
        false,
      );
    for (const op of ["undo", "redo"])
      expect(tools.apply_edits.input.safeParse(batch([{ op }])).success).toBe(
        true,
      );
    expect(operationSchemas).toHaveLength(12);
  });

  it("enforces export constraints without coercing parameter types", () => {
    for (const settings of [
      { width: 321 },
      { height: 15 },
      { fps: "30" },
      { fps: 0 },
      { bitrate: Infinity },
      { unknown: true },
    ])
      expect(tools.export_video.input.safeParse({ settings }).success).toBe(
        false,
      );
    expect(
      tools.export_video.input.safeParse({
        settings: { width: 1920, height: 1080 },
      }).success,
    ).toBe(true);
    expect(tools.preview_frame.input.safeParse({ time: -1 }).success).toBe(
      false,
    );
  });

  it("uses a separate strict browser import transport and validates other requests again", () => {
    expect(
      parseBrowserRequest("manage_assets", {
        action: "import",
        files: [{ name: "clip.mp4", type: "video/mp4", data: "" }],
      }).args.action,
    ).toBe("import");
    expect(() =>
      parseBrowserRequest("manage_assets", {
        action: "import",
        paths: ["/tmp/file"],
      }),
    ).toThrow();
    expect(() => parseBrowserRequest("preview_frame", { time: "3" })).toThrow();
    expect(() => parseBrowserRequest("connect_editor", {})).toThrow();
    expect(() => parseBrowserRequest("not_a_tool", {})).toThrow();
    expect(() => parseBrowserRequest("__proto__", {})).toThrow(
      "Unknown browser tool",
    );
  });

  it("describes actual project data without inventing output fields", () => {
    const project = emptyProject();
    project.clips.push(newClip(project, "text", project.tracks[0].id));
    expect(projectOutputSchema.parse(project)).toEqual(project);
    expect(
      tools.preview_frame.output.safeParse({ time: 2, mimeType: "image/png" })
        .success,
    ).toBe(true);
    expect(
      tools.manage_jobs.output.safeParse({
        id: "",
        status: "idle",
        progress: 0,
        fps: 0,
        frames: 0,
        error: "",
        downloadAvailable: false,
      }).success,
    ).toBe(true);
  });
});
