# Tech stack and architecture

## Selected stack

| Layer             | Choice and purpose                                                                                                                                                                                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App               | TypeScript, React, Vite; reusable typed React components and accessible semantic controls. Lazy-load the editor from the landing page.                                                                                                                                                                                                      |
| Styling           | Tailwind CSS utility classes exclusively; shared class variants for consistent design. Interface text starts at `text-xs` (12px); shared icon-button sizes provide 32/36/40px targets with 18px top-bar glyphs. Canvas timeline labels also use at least 12px. No handwritten CSS rules, CSS modules, CSS-in-JS, or inline style overrides. |
| Icons             | `@phosphor-icons/react` only; import individual icons and style through Tailwind classes. No other icon packages or custom SVG interface assets; imported vector media is separate project content.                                                                                                                                         |
| Appearance        | Shared React ThemeProvider: System/Light/Dark, `matchMedia('(prefers-color-scheme: dark)')`, localStorage preference, and a root theme attribute. Initialize before first paint; subscribe to OS changes only in System mode. Use Tailwind ancestor variants for both themes, including native-control color scheme.                        |
| Editing core      | Framework-independent TypeScript project model, typed commands, schema validation, undo/redo, revision checks, and active-clip filtering. Source timestamps remain in seconds; export timestamps derive from frame indices to avoid cumulative drift.                                                                                       |
| UI state          | Selective external-store subscriptions through React’s `useSyncExternalStore`; keep playhead/drag/frame updates outside React reconciliation.                                                                                                                                                                                               |
| Timeline          | Virtualized visible segments/tracks; Canvas 2D geometry, ruler, thumbnails, and waveforms; DOM controls and accessibility layer. Full-track worker analysis creates timestamped peak pyramids (up to 200 Hz, 240k base bins/source); persist derived caches separately in IndexedDB and draw only visible source intervals. Pointer capture and renderer-driven drag feedback avoid inline CSS geometry.                                                                                                                               |
| Containers/codecs | Mediabunny for lazy file reads, demux/mux, and codec probes; WebCodecs for browser-native decode/encode, requesting hardware acceleration when supported.                                                                                                                                                                                   |
| Compositor        | Custom WebGPU render graph in a worker using OffscreenCanvas. Cache pipelines, glyph atlases, and static element textures. Avoid a second competing scene-graph engine.                                                                                                                                                                     |
| Audio             | Web Audio scheduled buffers, audio-clock playback scheduling; bounded worker-side PCM mixing/resampling for deterministic export. Use the same gain/fade/timing rules in both paths. Source-time volume points interpolate in the mixer and survive trims/splits/retiming. Canvas volume lines/handles, range ducking, and numeric React controls share validated commands.                                                                                                                                                        |
| Elements          | Registry adapters for text, vector primitives, supported SVG/keyframes, video, and timed GIF frames. Decode animated assets once into bounded caches; optional worker/WASM codec adapters cover measured gaps.                                                                                                                              |
| Storage/output    | IndexedDB for project metadata; OPFS for large temporary exports. Stream muxed bytes with backpressure; use user-approved disk output where available, otherwise OPFS-backed file download. Blob-in-memory only for small outputs.                                                                                                          |
| MCP companion     | Node.js + official TypeScript MCP SDK v2 (`@modelcontextprotocol/server`), MCP stdio, and an authenticated same-origin WebSocket command bridge to the editor.                                                                                                                                                                              |
| Verification      | Vitest for timing/commands/history; Playwright for editing/export/MCP integration; browser performance traces and fixed media fixtures for benchmarks. Pin tested dependency versions and browser builds.                                                                                                                                   |

Shared React primitives include Button, IconButton, Field, Slider, Menu, Dialog, and Panel; feature components compose Media, Elements, Timeline, Preview, Properties, Export, and landing sections. Keep media/rendering services separate from UI components. Continuous geometry belongs in Canvas/WebGPU; DOM appearance/layout uses complete, statically discoverable Tailwind class variants.

## Media execution

```text
UI or MCP → validated command core → versioned project snapshot
Local files → demux/decode workers → GPU compositor → preview
Frozen export snapshot → decode/composite + audio mix → encode → mux → local file
```

- Keep the main thread for input, layout, and controls. Use bounded media-worker/decoder pools and a compositor worker. Coalesce pointer updates per animation frame; commit one undoable command per gesture. Redraw only active/invalidated content.
- Index active clips by time. Decode forward from keyframes, prefetch around the playhead, cancel stale seek requests, and cap queues/cache bytes. Transfer frame ownership; close `VideoFrame`/`AudioData` promptly.
- Import video frames as WebGPU external textures where supported; minimize CPU readbacks and pixel copies. Text handles are an overlay; final text, shapes, and animations pass through the same compositor for preview/export.
- Render preview against the audio clock at source/project cadence, independently of 60/120 Hz UI interaction. Drop late preview frames instead of blocking input. Reduce preview resolution when needed. Generated proxy media is not implemented in this version.
- Export uses explicit frame timestamps and bounded queues, not canvas recording or wall-clock playback. Freeze a project revision, render all frames, mix audio in chunks, and respect encoder/disk backpressure. Prioritize UI responsiveness over maximum export throughput.
- Current composition is SDR/sRGB. A high-precision linear working space is required before enabling HDR; enable HDR only after verifying high-precision surfaces, color transforms, output bit depth/transfer characteristics, and container metadata together. An HDR-capable canvas alone is insufficient.
- Probe and trial-run exact decoder/encoder configurations. Parsing a container does not establish codec support; decoding support does not establish encoding support. Prefer MP4/H.264/AAC where validated; expose tested alternatives. Treat unverified paths as unsupported.
- WebGPU + WebCodecs are the performance tier. Canvas 2D provides the SDR fallback when WebGPU is unavailable. FFmpeg.wasm is optional for specific import/conversion gaps, never the main render loop.

## MCP and hosting boundary

- **Web mode:** GitHub Pages serves static assets; editing, preview, and export stay local. Vite uses the repository base path; hash routing supports `/#/editor` without server rewrites. GitHub Actions builds/deploys the static site.
- **AI mode:** the user launches a companion that serves the same build on localhost and exposes MCP over stdio to a local agent. The editor connects to that companion on the same origin; rendering remains in the browser. This avoids making the hosted HTTPS site depend on insecure cross-origin localhost connections.
- Browser storage is origin-scoped: moving a Pages project to AI mode requires explicit project import/media relinking or a portable bundle. The companion cannot silently read the hosted tab’s files or IndexedDB.
- Use the SDK’s current **2026-07-28** protocol support and tested legacy compatibility; keep project IDs/revisions explicit. Standard remote MCP uses Streamable HTTP and would require reachable infrastructure, which is outside the zero-backend hosting model.
- Six tools share UI command schemas: inspect state/capabilities; manage allowed assets; atomically apply edits; render a frame; start export; inspect/cancel jobs. Return structured results and job IDs for long work rather than holding tool calls open.
- Bind the companion to loopback, validate Host/Origin, use a short-lived pairing secret and project/file allowlists, and expose no arbitrary JS/shell execution. Return an error if the browser disconnects.
- Core workers/WebCodecs do not require SharedArrayBuffer. Add shared memory only after measurement; WASM threading requires cross-origin isolation. On Pages, a tested service-worker header workaround is optional; the localhost companion can send real COOP/COEP headers.

## Performance gate before full UI implementation

Build a vertical slice: import → two overlapping clips → text/shape → transition → seek → audio sync → export/reopen. Run the [requirements benchmark](REQUIREMENTS.md) and representative 4K/HDR clips. Measure UI frame times, preview drops, seek latency, export FPS, memory, and thermal behavior; choose decoder/cache/preview budgets from results. Add a soak test to detect resource growth. No performance claim is accepted solely because a GPU API is used.

## Research references

- [Final Cut volume lines/range ducking](https://support.apple.com/guide/final-cut-pro/adjust-volume-verc1fabb77/mac), [CapCut audio keyframes](https://www.capcut.com/resource/how-to-add-keyframes-in-capcut).
- [Linear, inspected in browser](https://linear.app/) — screenshots and visual decisions in [requirements](REQUIREMENTS.md).
- [WebCodecs workers and frame lifetime](https://developer.chrome.com/docs/web-platform/best-practices/webcodecs), [WebGPU HDR](https://developer.chrome.com/blog/new-in-webgpu-129).
- [Mediabunny codec capabilities](https://mediabunny.dev/guide/supported-formats-and-codecs), [streaming output](https://github.com/vanilagy/mediabunny/blob/main/docs/guide/writing-media-files.md).
- [React external stores](https://react.dev/reference/react/useSyncExternalStore), [Vite static deployment](https://vite.dev/guide/static-deploy.html).
- [Tailwind appearance handling](https://tailwindcss.com/docs/dark-mode), [Phosphor React icons](https://github.com/phosphor-icons/react).
- [MCP transports](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports), [TypeScript server SDK](https://github.com/modelcontextprotocol/typescript-sdk/tree/main/packages/server), [current protocol changes](https://blog.modelcontextprotocol.io/posts/2026-07-28/).
- [Cross-origin isolation](https://web.dev/articles/cross-origin-isolation-guide), [Pages service-worker workaround](https://github.com/gzuidhof/coi-serviceworker), [GitHub Pages limits and commercial-use restrictions](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).

## Implemented release boundary

See [README](README.md) for operation/deployment and explicit compatibility limits, and [BENCHMARK](BENCHMARK.md) for measured results. The current implementation exports SDR; HDR-preserving output, generated proxies, and a bundled FFmpeg codec fallback are not implemented.
