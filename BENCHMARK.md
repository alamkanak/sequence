# Verification and performance

Measured **October 22, 2026 (America/Toronto)**. Raw reports use UTC timestamps. These are observed results, not universal performance guarantees.

## Environment and workloads

- Foreground in-app Chromium **155**, browser-reported **10 logical processors**, WebGPU renderer.
- Production static build at 1280 × 720, device pixel ratio 1. GPU/codec hardware model was not independently identified.
- Stress timeline: **600 seconds, 500 segments, eight tracks**, two simultaneous **1920 × 1080 / 30 FPS** H.264 sources, animated text/shapes, and music during the measured interval.
- The ten-second stress run uses a preview capped at 1280 pixels wide; original 1080p sources are decoded. It is not a ten-minute soak test.

| Measurement | Observed result |
| --- | --- |
| Stress UI requestAnimationFrame cadence | **100.04 FPS** |
| Stress p95 / maximum frame interval | **11.0 / 11.1 ms** |
| Stress main-thread tasks over 50 ms | **0** |
| Stress rendered preview frames | **295** during the ten-second window, including startup/preroll |
| Last worker composition latency | **0.4 ms**; not a p95 decode/seek measurement |
| Interaction run: preview move/rotate and timeline dragging | **100.03 UI FPS**, p95 frame interval **10.1 ms**, **0** long tasks |
| Interaction handler → next rAF | p95 **0.4 ms**, **40 samples**; not physical input-to-display latency |
| Fully edited 10.5-second export | **315 frames**, **377.1 export FPS**, approximately **0.8 seconds** render |
| MCP-controlled 12-second export, 640 × 360 | **360 frames**, **359.5 export FPS**, approximately **1.0 second** render |

A 100 FPS UI cadence does not mean the project produces 100 unique video frames per second; these projects are 30 FPS. The benchmark’s timer window includes audio preroll. Backpressure counts are not certified preview-frame drops.

## Independent export checks

Downloaded the actual edited output and inspected it with FFprobe/FFmpeg:

- H.264 video, 960 × 540, 30 FPS, **315 frames**.
- AAC audio, 48 kHz; both container track durations **10.500000 seconds**.
- The source music and decoded exported audio correlate at **0.99999**, with **0 ms best alignment** at 1 ms lag resolution over the 1–3 second window. This does not establish live display/speaker synchronization on every device.
- Extracted frames verify rendered titles, transparent shapes, animated vectors, and full-frame second footage. AAC encoder priming is measured and compensated; trailing packet duration is constrained to the timeline.

## Workflow exercised

The production app was exercised through its visible UI: disk import; video/music drag placement; first-video settings; split; speed; snapping; cross dissolve; text editing; shape move/resize handles; vector placement/rotation; enter/exit animation; audio fades; render; encoded-file preview and download. Numeric inspector state isolation was checked by switching between an element and footage and confirming footage geometry remained unchanged. Benchmark replacement was undone in a single action.

The current unit suite has 79 passing tests across thirteen files, including source-relative timing, ripple editing, paint, text layout, geometry/alignment, clipboard snapshots, atomic undo, worker shutdown, and safe MCP pairing links. MCP integration previously passed discovery plus real browser pairing, allowed-file import, placement, editing, idempotency, stale-revision rejection, preview, export, and job completion. Tailwind/Phosphor source constraints and the TypeScript production build pass.

October 23 interaction checks covered menu dismissal, readable navigation/track controls, circular presets, proportional/side resizing, resize guides, cross-track placement previews, copy/paste, undo, and navigation lifecycle checks. These checks do not establish a new FPS measurement.

Playwright workflow/theme/stress specifications are included and test discovery passes. The earlier editing/performance runs used the in-app browser. An additional isolated headless Chrome test verified HTTPS MCP approval, file import, edits, preview, export, and download availability. A clean-directory test verified URL-based npx installation, pairing authorization, and companion shutdown. These integration checks do not establish a new FPS measurement.

## Audio waveform and automation verification — October 23

A known 20-second stereo signal includes silence, different tone amplitudes, and right-only audio after 12 seconds. Full-source, trimmed, and 2×-speed waveform displays were checked through the UI. Range ducking, direct volume-line dragging, Option-click points, point dragging, and undo were exercised. The actual browser export contains 600 frames at 640 × 360 plus AAC audio. Independent decoded-audio comparison measures **−12.0002 dB** in the requested −12 dB section; unchanged tone sections differ by less than **0.005 dB**, and the silence test remains zero.

The production build was also measured with the audio waveform visible on the 500-segment/eight-track fixture: **100.035 UI FPS**, **10.7 ms p95 frame interval**, **0 long tasks**, and **295 composed preview frames** in a ten-second window. This is playback measurement, not physical input/display latency or a long-duration soak test.

## Reproduction

Generated screenshots, raw JSON reports, scratch media, and test exports are excluded from Git and removed during cleanup. This document retains the measured results. Use the **Performance lab** in the app or the commands in [README](README.md) to generate fresh measurements. Browser MCP integration writes local reports to `docs/verification/`; automated tests write artifacts to `test-results/`. Independent export verification: `python3 scripts/verify-export.py FILE --seconds 10.5 --frames 315` (requires FFprobe).

Unmeasured: long-duration thermal/soak behavior, full process/GPU peak memory, broad 4K/HDR workloads, physical input/display latency, and cross-device/browser behavior. The reported cache footprint is estimated layer pixels, not total memory. HDR-preserving export, generated proxies, and a bundled FFmpeg fallback are not implemented; see the explicit [compatibility limits](README.md#deliberate-compatibility-limits).
