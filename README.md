# Sequence

A browser-only React video editor with a Linear-inspired landing page and workspace. Media is read from disk and rendered locally. The static app needs no backend, account, or API key.

## Run

Requires Node.js 24 or newer.

```sh
npm ci
npm run dev
```

Open the printed URL. **Explore a sample project** loads original demo footage and music. Desktop Chrome/Edge with WebCodecs are the supported reference browsers.

## Editing workflow

1. Import videos/audio/images in **Media**, or drop files onto the workspace.
2. Drag cards onto timeline tracks. The first placed video sets dimensions and FPS. Use the project menu → **Project settings** to override them.
3. Drag segment bodies to move; drag edges to trim. The magnet enables snapping; hold Alt to bypass. Ripple mode shifts later segments on the same track when trimming/deleting.
4. Click the ruler to seek, select a segment, and press **S** to split. Set **Speed** in Properties. Video audio follows the same timing; speed changes pitch.
5. Open **Elements** to add text, shapes, or an animated vector. Edit numeric properties or drag preview bodies/corner handles/rotation handles/pivots. Panel dividers resize the workspace.
6. Set Enter/Exit animations or add transform keyframes at the playhead. Select a later visual segment and **Apply cross dissolve** to overlap it with its predecessor.
7. Place music on an audio track; adjust volume, duration, and fades.
8. Click **Export**, choose settings, render, then preview and download the actual encoded MP4/WebM.

Segment edges show a horizontal resize cursor for trimming. Selected visual elements have eight preview handles: sides resize width or height independently; corners preserve the current pixel aspect ratio. New ellipses start as 1:1 circles in project pixels. Hold Shift on a corner for free resizing. Hold Option (Alt on Windows/Linux) while resizing to expand both opposite sides around the visual center; corner proportions remain locked unless Shift is held. Resizing keeps the opposite side/corner fixed, including rotated elements, and creates one undo step.

Audio waveforms are built from the entire decoded source track across all channels, cached separately in IndexedDB, and drawn using each segment’s source in-point, speed, and visible time interval. Silence stays flat; trimmed segments show the retained audio. Background analysis leaves editing available. Peak pyramids bound drawing cost to visible pixels; base resolution is up to 200 bins/second, capped at 240,000 bins per source.

For volume changes within a segment, press **R** (or **Range**) and drag over its audio, then click **Lower range** to set dB and ramp duration. You can also drag the volume line inside a selected range. Option/Alt-click or double-click the volume line to add points, drag points to move/change them, and use **Audio → Volume points** for precise values or removal. Drag the line without a selected range to adjust overall volume; hold Shift for fine dragging. Automation follows source time through trimming, splitting, and speed changes, and applies in preview and export.

Fill and stroke each support independent opacity, solid colors, and linear/radial gradients with 2–8 editable color stops, positions, and per-stop opacity. Linear gradients have an angle control. Overall element opacity still applies to the combined result. These paints use the same renderer in preview and export; existing projects retain opaque solid paints.

Moving preview elements snaps their visual centers and edges to the canvas. Resizing snaps the active handle to canvas edges and center lines while preserving corner/side/center constraints, with pink alignment guides. Hold Alt while moving or Cmd/Ctrl while resizing to bypass snapping. Text boxes wrap at the chosen font size without squeezing glyphs. The neutral preview surround and frame outline distinguish the output canvas from black footage. Drag panel dividers to resize Media, Properties, Preview/Timeline height, or timeline track labels. Arrow keys also resize a focused divider; double-click resets it. Panel sizes persist locally.

Space plays/pauses; arrows step frames; Cmd/Ctrl+Z undoes; Cmd/Ctrl+D duplicates; Cmd/Ctrl+C copies the selected timeline segment and Cmd/Ctrl+V pastes a fresh copy at the playhead (within the current editor session); Cmd/Ctrl+S saves project JSON. Theme defaults to System; Light/Dark overrides persist.

Drop files anywhere in Media; a highlighted drop area appears and each drop imports once. Right-click a media card and choose **Remove media**; Shift+F10 opens the same menu from the keyboard. Removing media used on the timeline asks before removing its segments too; locked tracks must be unlocked first. Undo restores the media and its segments. Original disk files are never deleted.

Projects and imported files autosave to IndexedDB. Project JSON contains references, not media. Opening it on another origin/device requires importing the original files again to relink. Browser storage can be cleared or evicted.

## Publish to GitHub Pages

1. Push this repository to GitHub with `main` as the default branch.
2. Repository **Settings → Pages → Source → GitHub Actions**.
3. Run the included **Deploy to GitHub Pages** workflow. It tests, builds, discovers the Pages base path, and publishes `dist/`.

`npm run build` produces the complete static app. `npm run preview` serves that build locally. Hash routing, worker URLs, and media URLs work under a repository subpath. For another static host, publish `dist/`. For a custom explicit prefix: `BASE_PATH=/your-repository/ npm run build`.

No headers, SharedArrayBuffer, service-worker workaround, or server rendering are required by the current media engine. Check GitHub Pages’ restrictions before offering a commercial hosted service.

## Performance tools

Open the chart icon → **Performance lab**. Run a ten-second playback measurement; optionally load the **500-segment / 1080p** fixture first. It contains eight tracks, two simultaneous video sources, animated elements, and music. Loading it replaces the timeline as one undoable action; save JSON first to keep a separate copy. Reset measurements before exercising drag/trim/zoom to collect handler-to-next-frame latency; download the JSON report.

```sh
npm run check
npm test
npm run test:mcp
npx playwright install chromium
npm run test:e2e
npm run benchmark
PERFORMANCE_GATE=1 npm run benchmark
```

The optional performance gate expects ≥58 UI FPS and ≤20 ms p95 frame interval on appropriate foreground hardware. Headless/software GPU results are not comparable to native hardware. Automated tests retain failing traces/screenshots and export files under `test-results/`.

See [BENCHMARK.md](BENCHMARK.md) for measured results and independent exported-file checks. Generated screenshots, raw reports, and test exports are local artifacts excluded from Git; recreate them with the performance lab and verification scripts. UI requestAnimationFrame cadence is distinct from media FPS, export FPS, and physical display/speaker latency.

## Optional local MCP companion

```sh
npm run build
npm run mcp -- --allow-media /absolute/path/to/your/media
```

The companion prints a localhost editor URL containing a temporary pairing token to stderr. Open that URL and keep the editor open. It serves the same static build; the browser still decodes/renders/exports. Only explicitly allowed directories can be imported through the companion; the browser picker works without a directory allowlist.

Configure a local MCP client:

```json
{
  "mcpServers": {
    "sequence": {
      "command": "node",
      "args": ["/absolute/path/to/video-editor/companion/server.mjs", "--allow-media", "/absolute/path/to/media"]
    }
  }
}
```

Tools: `inspect_project`, `manage_assets`, `apply_edits`, `preview_frame`, `export_video`, `manage_jobs`. Inspect the current revision/IDs before applying typed operation batches; supply `expectedRevision` and `idempotencyKey`. Undo/redo are standalone operations. Exports return job IDs; completion/download appears in the editor’s Export dialog.

Normal Pages mode needs no companion. Cloud agents need separately reachable infrastructure; a static GitHub Pages origin cannot itself listen for standard MCP requests. Browser storage is scoped to origin, so moving a project to the localhost companion requires JSON import and media relinking.

## Deliberate compatibility limits

- Current editing/export is **SDR**. HDR detection requires explicit SDR-conversion consent at export; HDR10/HLG/Dolby Vision preservation is not implemented.
- MP4/H.264/AAC and WebM/VP9/Opus depend on runtime codec/configuration support. There is no bundled FFmpeg fallback. Errors explain unsupported inputs/outputs.
- GPU compositing uses WebGPU with a Canvas 2D fallback. Native WebCodecs acceleration remains browser/device controlled. Preview quality can be reduced; generated proxy media is not implemented.
- Static SVG images and the built-in animated-vector adapter are supported. Arbitrary SVG scripts/SMIL and Lottie are not. Animated GIFs require ImageDecoder.
- Playback uses scheduled Web Audio buffers with worker-side PCM mixing. Pitch preservation/time stretching and advanced audio effects are not implemented.
- Performance is measured for documented fixtures, not guaranteed for every codec, device, project, or background-tab policy.

All interface styling uses Tailwind classes; the CSS entry only imports Tailwind. All interface icons use Phosphor React. Reusable React controls compose the editor; time-sensitive rendering lives outside React. Element adapters are registered in `src/engine/elements.ts` and shared by preview/export workers.
