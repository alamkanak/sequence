# Sequence

A video editor that runs in your browser. No uploads, accounts, or backend.

**[Open Sequence](https://alamkanak.github.io/sequence/)**

![Sequence video editor with a multitrack timeline and preview](docs/images/screenshot.png)

## What you can do

- Import video, audio, and images into a multitrack timeline.
- Trim, split, change speed, and adjust audio with volume points.
- Add text, shapes, gradients, animations, and transitions.
- Preview your edits and export MP4 or WebM on your device.

Includes resizable panels, snapping, undo/redo, and light/dark themes.

## Your files stay local

Media and the current project autosave in your browser. Nothing is uploaded.
Clearing site data removes these copies. Saved project JSON does not include media;
keep the original files to reopen projects on another browser or device.

Use desktop Chrome or Edge for the best support. Codec support depends on your
browser and device. Exports are currently SDR; HDR preservation is not supported.

## Run locally

Requires Node.js 24 or newer.

```sh
git clone https://github.com/alamkanak/sequence.git
cd sequence
npm ci
npm run dev
```

## Deploy to GitHub Pages

In **Settings → Pages**, select **GitHub Actions** as the source.
Push to `main` or run the included **Deploy to GitHub Pages** workflow.

The site will be at **https://alamkanak.github.io/sequence/**.

## AI editing

An optional local MCP companion lets AI clients control a paired editor tab.
Configure your MCP client to launch `node /path/to/sequence/companion/server.mjs`
after running `npm run build`. Add `--allow-media /path/to/media` to allow local
media imports. Open the editor URL printed by the companion and keep it open.

The companion runs on your computer; it is separate from the GitHub Pages site.

## Development

Built with React, TypeScript, Tailwind CSS, Phosphor icons, and browser media APIs.

```sh
npm run check
npm test
npm run build
```

Performance measurements and benchmark instructions: [BENCHMARK.md](BENCHMARK.md).
