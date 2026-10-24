# Sequence Icon Studio

A separate HTML, Tailwind CSS, and vanilla JavaScript app for choosing and exporting
Sequence's visual identity. Edit brackets is the production identity; the other
nine geometric concepts remain available for exploration.

Run it from this folder:

```sh
cd icon-studio
npm run dev
```

Open **http://127.0.0.1:5180**. No install, editor server, or build is needed:
the compiled Tailwind stylesheet is checked in. You can also open `index.html`
directly in a current browser, or copy this folder somewhere else. The app does
not import anything from the main project or call a service. Manrope is bundled
locally, so typography also works offline and through direct file opening.
Set `PORT=5181 npm run dev` to use another port.

Choose a direction in the contact sheet or dropdown. Tune the palette, two-tone
accent, tile transparency, symbol size, and corner radius. Compare actual-size
16, 24, 32, and 48 pixel marks against light and dark backgrounds. The MCP preview
is illustrative; clients decide whether they display icons.

Changes are saved to this browser's local storage when available. **Save recipe**
downloads a portable JSON file; **Load recipe** restores it. **Reset** restores
palette and geometry while keeping the selected direction.

**Export assets** creates one ZIP locally containing:

- SVG favicon; PNG favicon fallbacks; ICO with 16, 32, and 48 pixel images.
- PNG marks at 16, 24, 32, 48, 64, 128, 180, 192, 256, 512, and 1024 pixels.
- Apple 180, web app 192 / 512, and maskable 512 icons, plus a relative web manifest.
- Transparent SVG icon marks and transparent PNG wordmarks for light / dark backgrounds.
- Light and dark 1200 × 630 social cards in PNG, with the primary card ready for link previews.
- Opaque MCP PNGs at 64 / 128 and embedded metadata in JSON and JavaScript.
- Recipe, asset inventory, and `INTEGRATION.md` with project integration details.

The ZIP mirrors `public/` and `companion/` for manual copying. It does not edit
the project. These assets are shared across favicon, landing, docs, editor, GitHub
README, social tags, shared MCP definitions, and the packaged companion. App/MCP icons
use an opaque tile even if the general mark is transparent; the maskable symbol
fits inside the central safe circle. Web app assets do not implement a service
worker or make the editor an offline PWA.

## Concepts

| # | Direction | Idea |
| --- | --- | --- |
| 01 | Splice S | A bold S made from an angular edit strip. |
| 02 | Timeline steps | Three staggered clips form a forward rhythm. |
| 03 | Frame fold | A folded frame leaves a play-shaped center. |
| 04 | Stacked play | A play tile sits over an offset layer. |
| 05 | Edit brackets | In/out brackets enclose a play triangle. |
| 06 | Match cut | Two opposing blocks meet at a diagonal splice. |
| 07 | Ribbon loop | Connected strips suggest a continuous sequence. |
| 08 | Split frame | Solid and open panels suggest before and after. |
| 09 | Forward tiles | Two stepped chevrons move from frame to frame. |
| 10 | Cue | A circular play symbol hints at the Q in Sequence. |

Edit brackets (05) is selected by default. The original first three concepts remain
marked as the exploration shortlist. `#timeline-steps`, for example, opens that
direction directly.

## Editing the studio

```sh
npm ci
npm run build:css
# Or, alongside the server:
npm run watch:css
```

Run `npm test` for dependency-free checks of recipe validation, vector sources,
maskable geometry, and ZIP / ICO binary structures.

Only stylesheet development needs installed dependencies. Commit `styles.css`
after changing Tailwind classes in `index.html` or `studio.js`. `styles.source.css`
explicitly scans only this app. No project build settings or runtime dependencies
are reused. `icons.js` owns the icon geometry; `brand.js` renders typography and social cards
on Canvas; `export.js` owns rasterization and archive formats; `studio.js` owns
the controls. The actual Manrope font is embedded in `fonts/manrope.js` with its
[SIL Open Font License](fonts/OFL.txt). Wordmarks and social cards are PNG-only;
the favicon and standalone icon marks retain their SVG exports. Exports use browser canvas and a
small ZIP store-mode writer, without third-party runtime code.

Format references: [Tailwind CLI](https://tailwindcss.com/docs/installation/tailwind-cli),
[MCP Icon schema](https://modelcontextprotocol.io/specification/2025-11-25/schema#icon),
and [web app icon metadata](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/icons).
