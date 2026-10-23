# Requirements

## Product and deployment

- A local-first video editor: import → arrange → edit → preview → export → preview exported file → download.
- Browser-only editing/rendering; no account, upload, paid API, or application backend. Static deployment on GitHub Pages.
- Performance reference: desktop Chrome/Edge; feature-detect other browsers and explain limitations.
- AI control requires an optional local MCP companion; a static website cannot expose a standard reachable MCP server.

## Editing workflow

| Area            | Required behavior                                                                                                                                                                                                                   |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Media           | Import local video, audio, and images; show metadata, thumbnails, full-source timestamped audio waveforms that follow trims/speed, and unsupported-format errors. Drag assets into tracks. Media removal belongs in a keyboard-accessible right-click context menu, with confirmation for timeline uses and undo support.                                                                                                |
| Project         | First timeline video sets dimensions, aspect ratio, and rational FPS, accounting for rotation. Allow manual overrides; later imports do not reset settings.                                                                         |
| Timeline        | Multiple reorderable tracks; visually higher video tracks composite above lower tracks. Audio tracks mix independently. Show placement previews when moving between tracks. Support zoom, pan, selection, track lock/hide/mute, and linked audio/video.                                 |
| Sticky editing  | Snapping to playhead, clip edges, and markers, with temporary bypass. Separate ripple mode closes gaps/shifts downstream clips on affected unlocked tracks.                                                                         |
| Segments        | Move, trim, split at playhead, delete, duplicate, copy/paste at the playhead with Cmd/Ctrl+C/V, change speed, adjust volume, add draggable volume points or duck a selected range with ramps, and undo/redo. Preserve linked audio/video synchronization.                                                                                          |
| Elements        | Add editable text and shapes; configure fonts, fill/stroke colors, independent fill/stroke opacity, solid/linear/radial paints with editable gradient stops, overall opacity, position, scale, rotation, and transform origin.                                                                                                              |
| Preview editing | Select elements directly; drag, resize, rotate, and move anchor/pivot handles. Option/Alt-resize expands both sides around the visual center, including rotated elements; Corners preserve proportions by default; side handles change one dimension; Shift frees corner aspect ratio. New circles use 1:1 pixel dimensions. Preview handles and numeric properties edit the same underlying values. Snap visual centers/edges when moving and active handles when resizing to the canvas with visible guides; Alt bypasses move snapping; Cmd/Ctrl bypasses resize snapping. Text boxes wrap without compressing glyphs.                                                                              |
| Motion          | Adjustable transitions between adjacent footage, plus enter/exit animation presets and transform/opacity keyframes for footage, text, and shapes. Define overlap duration and reject transitions without sufficient source handles. |
| Music           | Drag audio from Media onto a track; trim, move, split, set gain, and add fades.                                                                                                                                                     |
| Export          | Configure filename, container/codec, dimensions, FPS, bitrate/quality, audio, and supported color mode. Validate the exact configuration before starting; show progress, cancel, and useful errors.                                 |
| Export result   | Render locally, then preview the actual encoded output with sound and a download button. Repeated exports preserve the editable project.                                                                                            |

## Extensibility and persistence

- Element registry: loader, properties, timing, renderer, serialization, optional audio. Cover text, shapes, images, video, GIFs, and a documented animated-vector subset; extend without rewriting the timeline.
- Animation uses project timestamps, looping, and speed in preview/export. Warn on unsupported SVG/animation features.
- Autosave locally; save/open project JSON and relink media. JSON references media; browser storage may be cleared/evicted.
- UI/MCP share validated commands, stable IDs, atomic undo history, and project revisions.

## AI editing through MCP

- Expose seven generalized tools: `connect_editor`, `inspect_project`, `manage_assets`, `apply_edits`, `preview_frame`, `export_video`, and `manage_jobs`.
- Install through `npx` from a package published with the Pages build; no repository clone or user build. Pair the hosted editor with explicit browser approval.
- Inspect state, IDs, schemas, and capabilities; manage only user-selected files or allowed local directories.
- `apply_edits`: typed batches for project/tracks/clips/elements/keyframes and undo/redo; expected revision, idempotency key, validation-only mode, structured errors.
- Preview a timestamp; export asynchronously; inspect/cancel jobs. Require an open editor and report disconnection.
- Pair with the active project; synchronize human/agent edits. No arbitrary code or unrestricted file access.

## Design

- Build the landing page and editor from reusable, composable React components with typed props and shared UI primitives.
- Style the entire interface with Tailwind CSS utility classes only: no handwritten CSS rules, CSS modules, CSS-in-JS, or inline style overrides.
- Use Phosphor React icons exclusively; no other icon library or custom SVG interface assets. Imported vector media remains supported as project content.
- Support light and dark themes throughout. Default to **System**, follow live OS appearance changes, and offer **System / Light / Dark** settings. Persist explicit choices locally across reloads; returning to System restores OS tracking. Apply the resolved theme before first paint.
- Interface typography must be at least **12px**, including captions, labels, dialogs, landing-page previews, and canvas timeline text. Top-bar action icons use **18px** glyphs and **40px** buttons; appearance controls use 18px glyphs and 36px buttons. Landing navigation and project-menu labels use 14px; track controls use 16px icons with 24px targets. Project menus close after actions, on outside click, or Escape.
- Landing page: clear editing proposition, primary “Open editor” action, product preview, feature overview, local-processing explanation, and compatibility details.
- Editor: Media/Elements left, interactive preview center, Properties right, multitrack timeline below; resizable side panels, Preview/Timeline split, and track labels, with persisted sizes, keyboard resizing, and reset controls. Preview toolbar spans its panel; a neutral surround and frame outline distinguish the output canvas.
- Follow the visual language observed on [Linear](https://linear.app/) on **2026-10-22**: restrained color/rounding, fine borders, large left-aligned landing type, and compact editor controls. Dark mode uses near-black surfaces/off-white text; light mode uses light surfaces/dark text with equivalent hierarchy. Maintain readable contrast, clear selection/focus, and reduced-motion support in both.
- Inspected screenshots: [homepage](docs/references/linear-home-2026-10-22.jpg), [feature panels](docs/references/linear-features-2026-10-22.jpg). Use original branding/assets.

## Performance and acceptance

- Targets below are unmeasured release criteria, not universal guarantees. Record hardware, browser, acceleration, resolution, and preview quality.
- Baseline: an Apple M1/16 GB or comparable laptop, current stable desktop Chrome, 60 Hz display; 10-minute project, 8 tracks/500 segments, at most two simultaneous 1080p30 H.264 sources plus music, text/shapes, and a dissolve.
- Target ≥58 average UI FPS during playback/drag/zoom, p95 input-to-paint ≤50 ms, <1% missed preview frames after warm-up, and absolute A/V drift ≤20 ms. Cold seeks and proxy generation are measured separately. Measure 120 Hz interaction separately where available.
- Export must include every output frame, correct duration/audio timing, and matching composition within encoding tolerances. Publish export FPS and peak memory; do not promise real-time export.
- Test large files, VFR, rotation, long-GOP seeks, cancellation, relinking, and GPU loss. Adapt preview/proxies; preserve export quality.
- Verify both themes across all panels/dialogs, first-load OS matching, live System changes, persistent overrides, and reloads without a wrong-theme flash. App appearance must not change exported project colors.
- Validate codec/profile/resolution and HDR decode → composite → encode → metadata end to end. SDR and explicitly tested HDR modes must be labeled separately; tone-map only as an explicit user choice. No universal HEVC, 10-bit, HDR10/HLG, or Dolby Vision promise.
