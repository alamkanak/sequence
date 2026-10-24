import * as z from "zod/v4";
import manifest from "../package.json" with { type: "json" };
import brandIcons from "./brand-icons.json" with { type: "json" };

export { brandIcons };

// These runtime descriptions are the docstrings sent to MCP clients and rendered
// in the reference. Keep meaning, units and omission behavior here, not in UI copy.
export const serverVersion = manifest.version;
const number = z.number();
const id = z
  .string()
  .min(1)
  .max(160)
  .describe(
    "Stable identifier. For existing entities use the exact ID from inspect_project, not a name. New entities require a unique ID.",
  );
const color = z
  .string()
  .regex(/^#[\da-f]{6}$/i)
  .describe(
    "Opaque color in six-digit hexadecimal notation, for example #6366f1.",
  );
const fraction = number.min(0).max(1);
const kind = z
  .enum(["video", "audio", "image", "gif", "text", "shape", "vector"])
  .describe(
    "Element or media kind. Use inspect_project capabilities to discover available element adapters.",
  );
const motion = z
  .enum(["none", "fade", "slide", "zoom"])
  .describe("Entrance or exit animation preset. none disables the animation.");
const gradient = z
  .strictObject({
    type: z.enum(["linear", "radial"]).describe("Gradient geometry."),
    angle: number.describe(
      "Linear gradient angle in degrees; ignored for radial gradients.",
    ),
    stops: z
      .array(
        z.strictObject({
          offset: fraction.describe("Stop position from 0 (start) to 1 (end)."),
          color,
          opacity: fraction.describe(
            "Stop opacity from 0 (transparent) to 1 (opaque).",
          ),
        }),
      )
      .min(2)
      .max(8)
      .describe("Two to eight color stops along the gradient."),
  })
  .describe(
    "Gradient paint. Set the containing gradient field to null to use a solid color.",
  );

export const trackSchema = z
  .strictObject({
    id,
    name: z.string().max(100).describe("Track label shown in the timeline."),
    type: z
      .enum(["visual", "audio"])
      .describe("visual composites images and elements; audio contains sound."),
    hidden: z
      .boolean()
      .describe("Whether visual output from this track is hidden."),
    muted: z.boolean().describe("Whether audio from this track is muted."),
    locked: z
      .boolean()
      .describe(
        "Whether edits to clips on this track are blocked. Unlock before editing.",
      ),
  })
  .describe(
    "A complete timeline track. Supply a new unique ID when adding a track.",
  );

export const clipSchema = z
  .strictObject({
    id,
    trackId: id.describe(
      "ID of the destination track. The track must exist and be unlocked.",
    ),
    assetId: id
      .optional()
      .describe(
        "ID of imported media. Omit for generated text, shape or vector elements.",
      ),
    kind,
    name: z.string().max(500).describe("Segment label shown in the timeline."),
    start: number
      .nonnegative()
      .describe("Segment start in absolute timeline seconds."),
    duration: number
      .positive()
      .describe(
        "Segment duration in timeline seconds, after applying playback speed.",
      ),
    in: number
      .nonnegative()
      .describe(
        "Source-media in point in seconds. For generated elements use 0.",
      ),
    speed: number
      .min(0.1)
      .max(8)
      .describe(
        "Playback rate multiplier. 1 is normal speed; 2 plays twice as fast.",
      ),
    x: number.describe(
      "Horizontal center in project-width units. 0.5 is the center of the canvas.",
    ),
    y: number.describe(
      "Vertical center in project-height units. 0.5 is the center of the canvas.",
    ),
    width: number
      .positive()
      .describe(
        "Unscaled width as a fraction of project width. 1 fills the canvas width.",
      ),
    height: number
      .positive()
      .describe(
        "Unscaled height as a fraction of project height. 1 fills the canvas height.",
      ),
    rotation: number.describe("Rotation in degrees around the anchor."),
    opacity: fraction.describe(
      "Overall segment opacity from 0 (transparent) to 1 (opaque).",
    ),
    scale: number
      .positive()
      .describe(
        "Uniform size multiplier applied to width and height. 1 preserves size.",
      ),
    anchorX: number.describe(
      "Horizontal transform anchor as a fraction of segment width. 0.5 is centered.",
    ),
    anchorY: number.describe(
      "Vertical transform anchor as a fraction of segment height. 0.5 is centered.",
    ),
    volume: number
      .min(0)
      .max(4)
      .describe(
        "Linear audio gain. 0 is silent, 1 is original level, 4 is the maximum.",
      ),
    volumeKeyframes: z
      .array(
        z.strictObject({
          time: number
            .nonnegative()
            .describe(
              "Time in source-media seconds, before in-point trimming and speed changes.",
            ),
          value: number
            .min(0)
            .max(4)
            .describe(
              "Linear gain at this source time. Values between points are interpolated.",
            ),
        }),
      )
      .max(1000)
      .describe(
        "Source-time audio envelope. An empty array uses constant volume.",
      ),
    fadeIn: number
      .nonnegative()
      .describe("Fade-in duration in timeline seconds; 0 disables it."),
    fadeOut: number
      .nonnegative()
      .describe("Fade-out duration in timeline seconds; 0 disables it."),
    enter: motion,
    exit: motion,
    animDuration: number
      .positive()
      .describe("Entrance/exit animation duration in timeline seconds."),
    text: z
      .string()
      .max(20000)
      .describe(
        "Text content for text elements. Use an empty string for other kinds.",
      ),
    font: z
      .enum(["sans-serif", "serif", "monospace"])
      .describe("Browser font family for text elements."),
    fontSize: number.positive().describe("Text size in project pixels."),
    fill: color,
    fillOpacity: fraction.describe(
      "Solid fill opacity. Gradient stops carry their own opacity.",
    ),
    fillGradient: gradient
      .nullable()
      .describe("Fill gradient, or null to use the solid fill color."),
    stroke: color,
    strokeOpacity: fraction.describe("Solid outline opacity from 0 to 1."),
    strokeGradient: gradient
      .nullable()
      .describe("Outline gradient, or null to use the solid stroke color."),
    strokeWidth: number
      .nonnegative()
      .describe("Outline width in project pixels. 0 disables the outline."),
    shape: z
      .enum(["rectangle", "ellipse", "line"])
      .describe("Shape geometry; relevant only to shape elements."),
    radius: number
      .nonnegative()
      .describe("Rectangle corner radius in project pixels."),
    keyframes: z
      .array(
        z.strictObject({
          property: z
            .enum(["x", "y", "rotation", "opacity", "scale"])
            .describe(
              "Animated transform property; uses the same units as the segment field.",
            ),
          time: number
            .nonnegative()
            .describe("Time in seconds relative to the segment start."),
          value: number.describe(
            "Property value at this keyframe. Must remain valid for the animated property.",
          ),
        }),
      )
      .max(1000)
      .describe(
        "Transform keyframes in segment-local timeline seconds. An empty array uses static properties.",
      ),
  })
  .describe(
    "A complete timeline segment. Inspect an existing segment for reusable settings, and provide a new unique ID when adding.",
  );

const projectPatch = z
  .strictObject({
    name: z.string().max(200).describe("Project title."),
    width: number
      .int()
      .positive()
      .max(7680)
      .describe(
        "Canvas width in pixels. Export requires an even dimension of at least 16.",
      ),
    height: number
      .int()
      .positive()
      .max(7680)
      .describe(
        "Canvas height in pixels. Export requires an even dimension of at least 16.",
      ),
    fps: number
      .positive()
      .max(120)
      .describe("Project frame rate in frames per second."),
    background: color,
    initialized: z
      .boolean()
      .describe("Whether the initial project setup has been completed."),
  })
  .partial()
  .describe(
    "Project properties to change. Omitted properties retain their current values. IDs, revision and collections cannot be patched.",
  );

export const editOperations = [
  z
    .strictObject({
      op: z.literal("project").describe("Update project settings."),
      patch: projectPatch,
    })
    .describe("Change project name, canvas, frame rate or background."),
  z
    .strictObject({
      op: z.literal("add_track").describe("Create a track."),
      track: trackSchema,
    })
    .describe(
      "Insert a complete track at the top of the timeline. Its ID must be unique.",
    ),
  z
    .strictObject({
      op: z.literal("update_track").describe("Update a track."),
      id,
      patch: trackSchema
        .omit({ id: true })
        .partial()
        .describe(
          "Track properties to change. Omitted fields retain their values; the track ID cannot change.",
        ),
    })
    .describe(
      "Update an existing track, including its lock, visibility and mute settings.",
    ),
  z
    .strictObject({
      op: z.literal("delete_track").describe("Delete a track."),
      id,
    })
    .describe(
      "Delete a track and its segments. At least one track must remain.",
    ),
  z
    .strictObject({
      op: z.literal("add_clip").describe("Create a segment."),
      clip: clipSchema,
    })
    .describe(
      "Add a complete segment to an existing unlocked track. The segment ID must be unique.",
    ),
  z
    .strictObject({
      op: z.literal("update_clip").describe("Update a segment."),
      id,
      patch: clipSchema
        .omit({ id: true })
        .partial()
        .describe(
          "Segment properties to change. Omitted fields retain their values; the segment ID cannot change.",
        ),
    })
    .describe(
      "Update an existing segment on an unlocked track. The resulting project must remain valid.",
    ),
  z
    .strictObject({
      op: z.literal("delete_clip").describe("Delete a segment."),
      id,
      ripple: z
        .boolean()
        .optional()
        .describe(
          "When true, move later segments on the same track earlier by the removed duration. Omitted means false.",
        ),
    })
    .describe(
      "Remove a segment from an unlocked track, optionally closing its timeline gap.",
    ),
  z
    .strictObject({
      op: z.literal("delete_asset").describe("Delete imported media."),
      id,
    })
    .describe(
      "Remove an asset and all segments using it. Unlock every affected track first.",
    ),
  z
    .strictObject({
      op: z.literal("split").describe("Split a segment."),
      id,
      time: number
        .nonnegative()
        .describe(
          "Absolute timeline time in seconds, not source time. Leave at least one project frame on each side.",
        ),
    })
    .describe(
      "Split a segment into two at an absolute timeline time. The right half receives a generated ID.",
    ),
  z
    .strictObject({
      op: z
        .literal("transition")
        .describe("Overlap with the preceding segment."),
      id,
      seconds: number
        .nonnegative()
        .describe(
          "Overlap and fade-in duration in seconds; must be shorter than both segments. 0 removes the overlap.",
        ),
    })
    .describe(
      "Move this segment to overlap the preceding segment on its track and set its fade-in duration.",
    ),
] as const;
const historyOperations = [
  z
    .strictObject({
      op: z.literal("undo").describe("Undo the previous history entry."),
    })
    .describe(
      "Undo one history entry. Must be the only operation in the batch.",
    ),
  z
    .strictObject({
      op: z.literal("redo").describe("Redo the next history entry."),
    })
    .describe(
      "Redo one history entry. Must be the only operation in the batch.",
    ),
] as const;
export const operationSchemas = [...editOperations, ...historyOperations];

export const assetSchema = z
  .strictObject({
    id,
    name: z.string().describe("Original media file name."),
    kind,
    duration: number
      .nonnegative()
      .describe("Source duration in seconds; 0 for still images."),
    width: number
      .nonnegative()
      .describe("Source width in pixels; 0 for audio-only media."),
    height: number
      .nonnegative()
      .describe("Source height in pixels; 0 for audio-only media."),
    fps: number
      .nonnegative()
      .describe("Source frame rate; 0 when not applicable."),
    hasAudio: z
      .boolean()
      .describe("Whether the source contains an audio stream."),
    hdr: z.boolean().describe("Whether the source is high dynamic range."),
    thumbnail: z
      .string()
      .optional()
      .describe("Optional browser-local thumbnail URL or data URL."),
    size: number.nonnegative().describe("Source file size in bytes."),
    type: z.string().describe("Source MIME type."),
  })
  .describe(
    "Imported media metadata. Media bytes remain in the editor browser.",
  );
export const projectOutputSchema = z
  .strictObject({
    version: z.literal(1).describe("Saved project format version."),
    id,
    revision: number
      .int()
      .nonnegative()
      .describe(
        "Current project revision. Pass this to apply_edits.expectedRevision.",
      ),
    ...projectPatch.required().shape,
    tracks: z
      .array(trackSchema)
      .min(1)
      .max(64)
      .describe("Timeline tracks in display order."),
    assets: z
      .array(assetSchema)
      .max(2000)
      .describe("Imported media metadata; does not include media bytes."),
    clips: z
      .array(clipSchema)
      .max(10000)
      .describe(
        "Timeline segments referencing tracks and imported media by ID.",
      ),
  })
  .describe("Current browser-local project and its stable identifiers.");

const assetActions = [
  z
    .strictObject({
      action: z.literal("list").describe("List imported media."),
    })
    .describe("List metadata for all imported assets."),
  z
    .strictObject({
      action: z
        .literal("place")
        .describe("Place an existing asset on the timeline."),
      assetId: id,
      trackId: id
        .optional()
        .describe(
          "Destination track ID. Omit to choose a compatible unlocked track automatically.",
        ),
      start: number
        .nonnegative()
        .optional()
        .describe(
          "Absolute timeline start in seconds. Omit to append after the last segment on the chosen track, or at 0 if empty.",
        ),
    })
    .describe("Create a segment from an imported, available asset."),
  z
    .strictObject({
      action: z.literal("import").describe("Import allowed local files."),
      paths: z
        .array(
          z
            .string()
            .min(1)
            .describe(
              "Absolute local file path. Requires --allow-media for its directory or --allow-media-anywhere.",
            ),
        )
        .min(1)
        .max(20)
        .describe(
          "One to twenty file paths. Imports use binary transfers without a fixed file-size limit. The companion must allow each directory or use --allow-media-anywhere.",
        ),
    })
    .describe(
      "Import media from directories explicitly allowed when starting the companion.",
    ),
] as const;
const jobActions = [
  z
    .strictObject({
      action: z
        .literal("status")
        .default("status")
        .describe("Read the current export job. Omitted means status."),
      jobId: id
        .optional()
        .describe(
          "Expected job ID. Omit to inspect the current job, including idle state.",
        ),
    })
    .describe("Read export status without changing the job."),
  z
    .strictObject({
      action: z.literal("cancel").describe("Cancel the current export."),
      jobId: id.describe(
        "ID of the export to cancel. A mismatched ID is rejected.",
      ),
    })
    .describe(
      "Cancel the identified export. Ask the user before discarding an export they still need.",
    ),
] as const;
export const exportSettingsSchema = z
  .strictObject({
    name: z
      .string()
      .max(200)
      .describe("Output file name. Omit to use the project name."),
    width: number
      .int()
      .min(16)
      .max(7680)
      .multipleOf(2)
      .describe("Even output width in pixels. Omit to use project width."),
    height: number
      .int()
      .min(16)
      .max(7680)
      .multipleOf(2)
      .describe("Even output height in pixels. Omit to use project height."),
    fps: number
      .min(1)
      .max(120)
      .describe("Output frames per second. Omit to use project frame rate."),
    bitrate: number
      .min(100000)
      .max(100000000)
      .describe("Video bitrate in bits per second. Omit for 8000000 (8 Mbps)."),
    format: z
      .enum(["mp4", "webm"])
      .describe(
        "mp4 uses H.264/AAC; webm uses VP9/Opus. Omit for mp4. Check codec capabilities first.",
      ),
    audio: z.boolean().describe("Whether to include audio. Omit for true."),
    allowToneMap: z
      .boolean()
      .describe(
        "Allow HDR sources to be tone-mapped to SDR. Omit for false. HDR output is not supported.",
      ),
  })
  .describe("Resolved browser export settings.");
const assetResult = z
  .strictObject({
    items: z.array(assetSchema).describe("Imported asset metadata."),
  })
  .describe("Asset list or import result.");
const editResult = z
  .strictObject({
    revision: number
      .int()
      .nonnegative()
      .describe(
        "Resulting project revision, or the proposed revision during validation.",
      ),
    projectId: id.optional().describe("Project ID; omitted for undo and redo."),
    validated: z
      .literal(true)
      .optional()
      .describe("Present when a regular batch passed project validation."),
    applied: z
      .boolean()
      .describe("Whether the edit was committed. false for validateOnly."),
  })
  .describe("Edit receipt. Inspect again before preparing another batch.");

const applyEditsInput = z.strictObject({
  expectedRevision: number
    .int()
    .nonnegative()
    .describe(
      "Exact revision from the latest inspect_project. A mismatch rejects the entire batch.",
    ),
  idempotencyKey: z
    .string()
    .min(1)
    .max(160)
    .describe(
      "Unique key for this batch, for example a UUID. Reuse only when retrying the same batch; a committed key returns its original receipt.",
    ),
  validateOnly: z
    .boolean()
    .optional()
    .describe(
      "true validates without modifying the project. Omitted means false. Validation does not reserve the idempotency key.",
    ),
  operations: z
    .union([
      z.array(z.discriminatedUnion("op", editOperations)).min(1).max(500),
      z.array(z.discriminatedUnion("op", historyOperations)).length(1),
    ])
    .describe(
      "An atomic batch of regular edits, or one standalone undo/redo. Operations execute in order and may reference IDs created earlier in this batch.",
    ),
});

// Examples are ordinary typed values and are validated by docsCatalog at build time.
const exampleClip: z.input<typeof clipSchema> = {
  id: "title-1",
  trackId: "track-1",
  kind: "text",
  name: "Opening title",
  start: 0,
  duration: 5,
  in: 0,
  speed: 1,
  x: 0.5,
  y: 0.5,
  width: 0.8,
  height: 0.25,
  rotation: 0,
  opacity: 1,
  scale: 1,
  anchorX: 0.5,
  anchorY: 0.5,
  volume: 1,
  volumeKeyframes: [],
  fadeIn: 0,
  fadeOut: 0,
  enter: "fade",
  exit: "fade",
  animDuration: 0.5,
  text: "My film",
  font: "sans-serif",
  fontSize: 72,
  fill: "#ffffff",
  fillOpacity: 1,
  fillGradient: null,
  stroke: "#000000",
  strokeOpacity: 1,
  strokeGradient: null,
  strokeWidth: 0,
  shape: "rectangle",
  radius: 0,
  keyframes: [],
};
const exampleOperationSchema = z.discriminatedUnion("op", [
  ...editOperations,
  ...historyOperations,
]);
const editExamples: {
  label: string;
  operation: z.input<typeof exampleOperationSchema>;
}[] = [
  {
    label: "Rename the project",
    operation: { op: "project", patch: { name: "My film" } },
  },
  {
    label: "Add a visual track",
    operation: {
      op: "add_track",
      track: {
        id: "track-1",
        name: "Titles",
        type: "visual",
        hidden: false,
        muted: false,
        locked: false,
      },
    },
  },
  {
    label: "Mute a track",
    operation: { op: "update_track", id: "track-1", patch: { muted: true } },
  },
  { label: "Delete a track", operation: { op: "delete_track", id: "track-1" } },
  { label: "Add a title", operation: { op: "add_clip", clip: exampleClip } },
  {
    label: "Move a segment",
    operation: { op: "update_clip", id: "clip-1", patch: { start: 2 } },
  },
  {
    label: "Remove a segment and close the gap",
    operation: { op: "delete_clip", id: "clip-1", ripple: true },
  },
  {
    label: "Delete an asset and its segments",
    operation: { op: "delete_asset", id: "asset-1" },
  },
  {
    label: "Validate a split",
    operation: { op: "split", id: "clip-1", time: 2.5 },
  },
  {
    label: "Add an overlapping transition",
    operation: { op: "transition", id: "clip-2", seconds: 0.5 },
  },
  { label: "Undo one change", operation: { op: "undo" } },
  { label: "Redo one change", operation: { op: "redo" } },
];

function defineTool<I extends z.ZodType, O extends z.ZodType>(definition: {
  title: string;
  description: string;
  category: string;
  input: I;
  output: O;
  examples: { label: string; arguments: z.input<I> }[];
  variants?: readonly z.ZodType[];
}) {
  return definition;
}

export const tools = {
  connect_editor: defineTool({
    title: "Connect editor",
    category: "Connection",
    description:
      "Start here. Return the Sequence editor pairing URL and connection status. Show the URL to the user and ask them to approve Connect AI agent in their browser. No repository clone or app build is needed. Pairing links expire when the companion stops; keep one approved editor tab open. This tool works before an editor is connected.",
    input: z.strictObject({}),
    output: z.strictObject({
      connected: z
        .boolean()
        .describe("Whether an approved editor tab is currently connected."),
      url: z
        .url()
        .describe(
          "Pairing URL for this companion session. Show it to the user; do not publish or persist its credentials.",
        ),
      instructions: z
        .string()
        .describe("Connection instructions to relay to the user."),
    }),
    examples: [{ label: "Get a pairing link", arguments: {} }],
  }),
  inspect_project: defineTool({
    title: "Inspect project",
    category: "Connection",
    description:
      "Inspect the approved, connected editor before editing. Return its project, current revision, stable IDs, missing media IDs and available codec/element capabilities. Use the returned revision for apply_edits; use IDs rather than names. Requires connect_editor and browser approval. Media bytes are not returned.",
    input: z.strictObject({}),
    output: z.strictObject({
      project: projectOutputSchema,
      missingAssets: z
        .array(id)
        .describe(
          "Asset IDs whose original files need relinking in the browser.",
        ),
      capabilities: z
        .strictObject({
          elements: z
            .array(
              z.strictObject({
                type: kind,
                title: z.string().describe("Human-readable element name."),
                duration: z
                  .enum(["fixed", "source"])
                  .describe(
                    "Whether element duration is independent of media or limited by its source.",
                  ),
                properties: z
                  .array(
                    z.enum(
                      Object.keys(clipSchema.shape) as [
                        keyof typeof clipSchema.shape,
                        ...(keyof typeof clipSchema.shape)[],
                      ],
                    ),
                  )
                  .describe(
                    "Editable segment properties supported by this element.",
                  ),
              }),
            )
            .describe("Available element adapters."),
          animations: z.array(motion).describe("Supported animation presets."),
          keyframeProperties: z
            .array(z.enum(["x", "y", "scale", "rotation", "opacity"]))
            .describe("Properties supported by transform keyframes."),
          sdrOnly: z.literal(true).describe("Only SDR output is supported."),
          video: z
            .strictObject({
              avc: z
                .boolean()
                .describe(
                  "H.264 encoding supported for current project dimensions.",
                ),
              vp9: z
                .boolean()
                .describe(
                  "VP9 encoding supported for current project dimensions.",
                ),
            })
            .describe("Browser video encoder capabilities."),
          audio: z
            .strictObject({
              aac: z.boolean().describe("AAC encoding supported."),
              opus: z.boolean().describe("Opus encoding supported."),
            })
            .describe("Browser audio encoder capabilities."),
        })
        .describe("Capabilities detected in the connected browser."),
    }),
    examples: [{ label: "Read project and capabilities", arguments: {} }],
  }),
  manage_assets: defineTool({
    title: "Manage assets",
    category: "Editing",
    description:
      "List imported assets, place available media on the timeline, or import local files. Requires an approved connected editor. Choose action list, place or import and supply only that action's fields. Imports require --allow-media directories or --allow-media-anywhere. Files transfer directly to the browser without a fixed file-size limit. Placement changes the project revision; inspect again before apply_edits.",
    input: z.discriminatedUnion("action", assetActions),
    output: z.union([
      assetResult,
      z.strictObject({
        revision: number
          .int()
          .nonnegative()
          .describe("Project revision after placing the asset."),
      }),
    ]),
    variants: assetActions,
    examples: [
      { label: "List assets", arguments: { action: "list" } },
      {
        label: "Place an asset",
        arguments: { action: "place", assetId: "asset-1", start: 0 },
      },
      {
        label: "Import local media",
        arguments: { action: "import", paths: ["/Users/you/Movies/intro.mp4"] },
      },
    ],
  }),
  apply_edits: defineTool({
    title: "Apply edits",
    category: "Editing",
    description:
      "Apply an atomic editing batch to the approved connected editor. Inspect first, pass its expectedRevision and a unique idempotencyKey, and use stable IDs. Each operation has an explicit schema; unknown fields are rejected. A batch contains 1–500 regular operations, or exactly one undo or redo. validateOnly checks without committing or saving an idempotency receipt. Revision conflicts require reinspection. Retries with the same key return the earlier receipt. Locked tracks and invalid project references are rejected.",
    input: applyEditsInput,
    output: editResult,
    variants: operationSchemas,
    examples: editExamples.map(({ label, operation }) => ({
      label,
      arguments: applyEditsInput.parse({
        expectedRevision: 3,
        idempotencyKey: `example-${operation.op}-1`,
        validateOnly: operation.op === "split",
        operations: [operation],
      }),
    })),
  }),
  preview_frame: defineTool({
    title: "Preview frame",
    category: "Rendering",
    description:
      "Render an absolute timeline timestamp in the approved connected editor. Return the composed frame as MCP image content, plus timestamp and MIME type metadata. Uses the same browser renderer as manual editing and moves the playhead. Requires an open editor with available media. A preview shares the requested image with the AI client.",
    input: z.strictObject({
      time: number
        .nonnegative()
        .describe(
          "Absolute timeline timestamp in seconds. The editor clamps it to the project duration.",
        ),
    }),
    output: z.strictObject({
      time: number
        .nonnegative()
        .describe("Actual rendered timeline timestamp in seconds."),
      mimeType: z
        .string()
        .describe(
          "MIME type of the image content returned alongside this metadata.",
        ),
    }),
    examples: [{ label: "Preview at 2.5 seconds", arguments: { time: 2.5 } }],
  }),
  export_video: defineTool({
    title: "Export video",
    category: "Rendering",
    description:
      "Start an asynchronous browser-local export and return its job ID. Requires an approved connected editor. Inspect codec capabilities first. Defaults to project dimensions, frame rate and name, 8 Mbps, SDR MP4/H.264/AAC with audio. Output dimensions must be even. Only one export runs at a time. Poll manage_jobs with the returned ID; the user downloads the completed file from the editor.",
    input: z.strictObject({
      settings: exportSettingsSchema
        .partial()
        .optional()
        .describe(
          "Optional export overrides. Omitted fields use the defaults described on each property.",
        ),
    }),
    output: z.strictObject({
      jobId: id.describe(
        "New export job ID. Pass this to manage_jobs to read progress or cancel.",
      ),
    }),
    examples: [
      { label: "Export with project defaults", arguments: {} },
      {
        label: "Export 1080p MP4",
        arguments: {
          settings: {
            width: 1920,
            height: 1080,
            fps: 30,
            format: "mp4",
            audio: true,
          },
        },
      },
    ],
  }),
  manage_jobs: defineTool({
    title: "Manage jobs",
    category: "Rendering",
    description:
      "Read the current browser export status or cancel an identified export. Requires an approved connected editor. Omitted action means status. Supply jobId to reject a stale or different job; cancel requires jobId. Progress ranges from 0 to 1. Completion exposes download availability, not file bytes or a remote URL; download through the editor.",
    input: z.union(jobActions),
    variants: jobActions,
    output: z.strictObject({
      id: z
        .string()
        .describe("Current job ID; empty when no export has started."),
      status: z
        .enum(["idle", "rendering", "complete", "error", "canceled"])
        .describe("Export lifecycle state."),
      progress: fraction.describe("Completed fraction from 0 to 1."),
      fps: number
        .nonnegative()
        .describe("Observed rendering throughput in frames per second."),
      frames: number
        .nonnegative()
        .describe("Number of frames rendered so far."),
      error: z
        .string()
        .describe("Error or cancellation message; empty when none."),
      seconds: number
        .nonnegative()
        .optional()
        .describe(
          "Elapsed export duration in seconds, available after completion.",
        ),
      renderer: z
        .string()
        .optional()
        .describe("Renderer used for the completed export."),
      audioPrimingCorrectionMs: number
        .nonnegative()
        .optional()
        .describe(
          "Audio encoder priming correction applied in milliseconds, available after completion.",
        ),
      storage: z
        .enum(["OPFS", "memory"])
        .optional()
        .describe(
          "Browser storage used for the completed file: origin-private file system or memory.",
        ),
      settings: exportSettingsSchema
        .optional()
        .describe(
          "Resolved settings for the current export; absent in initial idle state.",
        ),
      bytes: number
        .nonnegative()
        .optional()
        .describe(
          "Completed file size in bytes; absent until a file is available.",
        ),
      downloadAvailable: z
        .boolean()
        .describe("Whether the user can download the file from the editor."),
    }),
    examples: [
      { label: "Read current status", arguments: {} },
      {
        label: "Poll a specific job",
        arguments: { action: "status", jobId: "export-1" },
      },
      {
        label: "Cancel an export",
        arguments: { action: "cancel", jobId: "export-1" },
      },
    ],
  }),
} as const;

export type ToolName = keyof typeof tools;
export type ToolInput<N extends ToolName> = z.output<
  (typeof tools)[N]["input"]
>;
export type ToolOutput<N extends ToolName> = z.output<
  (typeof tools)[N]["output"]
>;
export type ToolRequest = {
  [N in ToolName]: { name: N; args: ToolInput<N> };
}[ToolName];

// The companion opens authorized files and sends short-lived transfer IDs.
// The browser fetches binary bytes directly; clients cannot supply transfer IDs.
export const importedFileSchema = z.strictObject({
  id: z.uuid(),
  name: z.string().min(1),
  type: z.string(),
  size: z.number().int().nonnegative(),
});
export const connectionInfoSchema = z.strictObject({
  serverName: z.string(),
  serverVersion: z.string(),
  client: z.strictObject({ name: z.string(), version: z.string() }).nullable(),
  mediaAccess: z.strictObject({
    mode: z.enum(["none", "directories", "anywhere"]),
    directories: z.array(z.string()),
  }),
});
export type ConnectionInfo = z.infer<typeof connectionInfoSchema>;
export type BrowserToolRequest =
  | Exclude<ToolRequest, { name: "connect_editor" } | { name: "manage_assets" }>
  | {
      name: "manage_assets";
      args:
        | Exclude<ToolInput<"manage_assets">, { action: "import" }>
        | { action: "import"; files: z.infer<typeof importedFileSchema>[] };
    };
export function parseBrowserRequest(
  name: unknown,
  args: unknown,
): BrowserToolRequest {
  if (
    typeof name !== "string" ||
    !Object.hasOwn(tools, name) ||
    name === "connect_editor"
  )
    throw new Error("Unknown browser tool");
  if (name === "manage_assets") {
    const schema = z.discriminatedUnion("action", [
      assetActions[0],
      assetActions[1],
      z.strictObject({
        action: z.literal("import"),
        files: z.array(importedFileSchema).min(1).max(20),
      }),
    ]);
    return { name, args: schema.parse(args) };
  }
  return {
    name,
    args: tools[
      name as Exclude<ToolName, "connect_editor" | "manage_assets">
    ].input.parse(args),
  } as BrowserToolRequest;
}

export function jsonSchema(
  schema: z.ZodType,
  io: "input" | "output" = "input",
) {
  return z.toJSONSchema(schema, { io });
}
export function toolCatalog() {
  return Object.entries(tools).map(([name, tool]) => ({
    name,
    title: tool.title,
    description: tool.description,
    icons: brandIcons,
    inputSchema: { ...jsonSchema(tool.input), type: "object" as const },
    outputSchema: {
      ...jsonSchema(tool.output, "output"),
      type: "object" as const,
    },
  }));
}
