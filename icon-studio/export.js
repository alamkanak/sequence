/* Browser-native raster / Canvas export, multi-resolution ICO, and ZIP (store mode + CRC32). */
(() => {
  const encoder = new TextEncoder();
  const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
    for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    return value >>> 0;
  });
  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }
  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  async function png(svg, width, height = width) {
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    try {
      const image = new Image();
      const loaded = new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error("Could not render the SVG. Try a current Chrome, Firefox, Edge, or Safari."));
      });
      image.src = url;
      await loaded;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas rendering is unavailable in this browser.");
      context.drawImage(image, 0, 0, width, height);
      const blob = await new Promise((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("PNG export failed.")), "image/png"));
      return new Uint8Array(await blob.arrayBuffer());
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  function ico(images) {
    const header = new Uint8Array(6 + 16 * images.length);
    const view = new DataView(header.buffer);
    view.setUint16(2, 1, true);
    view.setUint16(4, images.length, true);
    let offset = header.length;
    images.forEach(({ size, bytes }, i) => {
      const entry = 6 + i * 16;
      view.setUint8(entry, size === 256 ? 0 : size);
      view.setUint8(entry + 1, size === 256 ? 0 : size);
      view.setUint16(entry + 4, 1, true);
      view.setUint16(entry + 6, 32, true);
      view.setUint32(entry + 8, bytes.length, true);
      view.setUint32(entry + 12, offset, true);
      offset += bytes.length;
    });
    return new Blob([header, ...images.map((image) => image.bytes)], { type: "image/x-icon" });
  }
  async function zip(files) {
    const pieces = [];
    const directory = [];
    let offset = 0;
    const now = new Date();
    const time = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
    const date = ((Math.max(1980, now.getFullYear()) - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    for (const file of files) {
      const name = encoder.encode(file.path);
      const bytes = typeof file.data === "string" ? encoder.encode(file.data) : file.data instanceof Blob ? new Uint8Array(await file.data.arrayBuffer()) : file.data;
      const crc = crc32(bytes);
      const local = new Uint8Array(30 + name.length);
      const view = new DataView(local.buffer);
      view.setUint32(0, 0x04034b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 0x0800, true);
      view.setUint16(10, time, true);
      view.setUint16(12, date, true);
      view.setUint32(14, crc, true);
      view.setUint32(18, bytes.length, true);
      view.setUint32(22, bytes.length, true);
      view.setUint16(26, name.length, true);
      local.set(name, 30);
      const central = new Uint8Array(46 + name.length);
      const cv = new DataView(central.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(12, time, true);
      cv.setUint16(14, date, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, bytes.length, true);
      cv.setUint32(24, bytes.length, true);
      cv.setUint16(28, name.length, true);
      cv.setUint32(42, offset, true);
      central.set(name, 46);
      pieces.push(local, bytes);
      directory.push(central);
      offset += local.length + bytes.length;
    }
    const end = new Uint8Array(22);
    const ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, directory.reduce((sum, part) => sum + part.length, 0), true);
    ev.setUint32(16, offset, true);
    return new Blob([...pieces, ...directory, end], { type: "application/zip" });
  }
  function dataUri(bytes) {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return `data:image/png;base64,${btoa(binary)}`;
  }
  function integrationGuide(concept) {
    return `# Sequence identity kit — ${concept.name}

The project's brand references are integrated. To apply a new studio export:

1. Copy public/ from this ZIP into the project's public/ directory.
2. Copy companion/brand-icons.json into companion/. This is the embedded PNG
   metadata shared by serverInfo.icons and all seven tools in toolCatalog().
   The optional brand-icons.mjs is a portable module for other consumers; the
   Sequence companion itself imports the JSON directly.
3. Keep the recipe and asset inventory in public/brand/ with the exported assets.
   The recipe can be loaded back into the independent icon studio.
4. Run npm run check, npm test, npm run build, npm run test:mcp and
   npm run test:mcp:package. Restart the MCP client to refresh its icon metadata.
5. Deploy through the existing GitHub Pages workflow. If distributing a changed
   MCP package, bump the package version and update the README/docs download URLs
   so npx does not reuse an older cached package.

Existing references:
- Both HTML entries load favicon.ico, favicon-32.png, favicon.svg, the Apple icon,
  the web manifest, and an absolute HTTPS social-card URL.
- BrandMark displays public/brand/mark.svg in the landing header, footer and product
  preview, the editor header, and the documentation header.
- The GitHub README uses public/brand/wordmark-light.png / wordmark-dark.png.
- companion/contracts.ts imports companion/brand-icons.json; the MCP server and
  generated docs JSON share these icons. scripts/package-mcp.mjs includes the JSON.
- Vite's deployment base and the relative web manifest support /sequence/ hosting.

Export details:
- Standard icons use the selected tile setting. Apple, app, and MCP icons keep an
  opaque tile; maskable uses a full-bleed tile with the symbol inside its safe circle.
- PNGs: 16, 24, 32, 48, 64, 128, 180, 192, 256, 512, 1024 pixels.
- ICO: PNG-backed 16, 32, 48 pixel images for modern browsers and operating systems.
- Wordmarks and social cards are PNGs rendered with the bundled Manrope font.
  Their lettering is rasterized on Canvas, not drawn as SVG paths.
- The web manifest alone does not add a service worker or offline app support.
- The client's UI decides whether and where MCP icons appear.
- MCP schema: https://modelcontextprotocol.io/specification/2025-11-25/schema#icon.

`;
  }
  async function buildKit(input, progress = () => {}) {
    const studio = window.SequenceStudio;
    // Snapshot settings: an export can never mix two sets of colors or geometry.
    const state = studio.normalize(input);
    const concept = studio.concepts.find((c) => c.id === state.concept);
    const files = [];
    const add = (path, data, purpose, dimensions) => files.push({ path, data, purpose, ...(dimensions ? { dimensions } : {}) });
    const dimensions = (width, height = width) => ({ width, height });
    const master = studio.svg(state);
    add("public/favicon.svg", master, "Browser favicon, scalable");
    add("public/brand/mark.svg", master, "Primary mark, selected tile setting");
    add("public/brand/mark-transparent.svg", studio.svg(state, { transparent: true }), "Transparent mark in selected colors");
    add("public/brand/mark-on-light.svg", studio.svg(state, { transparent: true, foreground: "#24232B" }), "Transparent dark mark for light backgrounds");
    add("public/brand/mark-on-dark.svg", studio.svg(state, { transparent: true, foreground: "#F6F5FA" }), "Transparent light mark for dark backgrounds");
    const rasters = new Map();
    for (const size of [16, 24, 32, 48, 64, 128, 180, 192, 256, 512, 1024]) {
      progress(`Rendering ${size} × ${size}…`);
      const bytes = await png(master, size);
      rasters.set(size, bytes);
      add(`public/brand/icon-${size}.png`, bytes, "General-purpose raster mark", dimensions(size));
    }
    add("public/favicon-16.png", rasters.get(16), "Browser PNG favicon", dimensions(16));
    add("public/favicon-32.png", rasters.get(32), "Browser PNG favicon fallback", dimensions(32));
    add("public/favicon.ico", ico([16, 32, 48].map((size) => ({ size, bytes: rasters.get(size) }))), "Multi-image browser ICO", { sizes: [16, 32, 48] });
    const opaque = studio.svg(state, { transparent: false });
    add("public/apple-touch-icon.png", await png(opaque, 180), "Opaque Apple home-screen icon", dimensions(180));
    for (const size of [192, 512]) add(`public/brand/app-${size}.png`, await png(opaque, size), "Opaque web app icon", dimensions(size));
    add("public/brand/maskable-512.png", await png(studio.svg(state, { maskable: true, transparent: false }), 512), "Full-bleed app icon with safe symbol", dimensions(512));
    progress("Rendering Manrope wordmarks and social cards…");
    const brand = await window.SequenceStudioBrand.render(state);
    for (const theme of ["light", "dark"]) {
      const source = theme === "light" ? brand.wordmarkLight : brand.wordmarkDark;
      add(`public/brand/wordmark-${theme}.png`, await window.SequenceStudioBrand.png(source), `Transparent Manrope wordmark for ${theme} backgrounds`, dimensions(source.width, source.height));
    }
    add("public/brand/social-card.png", await window.SequenceStudioBrand.png(brand.socialLight), "Primary social card: free browser editing, by hand or with an AI agent", dimensions(1200, 630));
    add("public/brand/social-card-dark.png", await window.SequenceStudioBrand.png(brand.socialDark), "Dark social card alternate", dimensions(1200, 630));
    const icons = [];
    for (const size of [64, 128]) {
      const bytes = await png(opaque, size);
      add(`public/brand/mcp-${size}.png`, bytes, "Opaque portable MCP icon", dimensions(size));
      icons.push({ src: dataUri(bytes), mimeType: "image/png", sizes: [`${size}x${size}`] });
    }
    add("companion/brand-icons.mjs", `// Generated by Sequence Icon Studio. Shared server and tool metadata.\nexport const brandIcons = ${JSON.stringify(icons, null, 2)};\n`, "Self-contained MCP icon metadata module");
    add("companion/brand-icons.json", JSON.stringify(icons, null, 2) + "\n", "Portable MCP icons metadata");
    add("public/site.webmanifest", JSON.stringify({ name: "Sequence", short_name: "Sequence", start_url: "./", scope: "./", display: "standalone", background_color: state.bg, theme_color: state.bg, icons: [{ src: "brand/app-192.png", sizes: "192x192", type: "image/png", purpose: "any" }, { src: "brand/app-512.png", sizes: "512x512", type: "image/png", purpose: "any" }, { src: "brand/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }] }, null, 2) + "\n", "Deployment-relative app manifest");
    add("public/brand/recipe.json", JSON.stringify(state, null, 2) + "\n", "Editable studio settings");
    add("INTEGRATION.md", integrationGuide(concept), "Project-specific integration guide");
    const inventory = files.map(({ path, purpose, dimensions }) => ({ path, purpose, ...(dimensions ? { dimensions } : {}) }));
    add("public/brand/asset-manifest.json", JSON.stringify({ generator: "Sequence Icon Studio 2", typography: { family: "Manrope", format: "PNG" }, socialCopy: window.SequenceStudioBrand.copy, concept: concept.name, generatedAt: new Date().toISOString(), recipe: state, files: inventory }, null, 2) + "\n", "Asset inventory and settings");
    progress(`Packing ${files.length} files…`);
    return { blob: await zip(files), files: inventory, filename: `sequence-${concept.id}-assets.zip` };
  }
  window.SequenceStudioExport = { download, png, ico, zip, buildKit };
})();
