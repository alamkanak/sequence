/* Pure vector construction. No editor imports, fonts, remote assets, or framework. */
(() => {
  const concepts = [
    { id: "splice-s", name: "Splice S", tagline: "An S, cut from a single strip.", reason: "A bold, angular S doubles as two interlocking edit strips. A letter gives Sequence its own signature; broad cuts keep the silhouette legible at 16 pixels.", recommended: true,
      draw: (f, a) => `<path fill="${f}" d="M48 14H25L14 25v11h24v6H14v8h25l11-11V28H26v-6h22Z"/><path fill="${a}" d="M48 14H25L14 25h12v-3h22Z"/>` },
    { id: "timeline-steps", name: "Timeline steps", tagline: "Three clips. One forward rhythm.", reason: "Three staggered clips turn a timeline into a compact staircase. It says editing and progression with only three shapes, making it one of the strongest favicon candidates.", recommended: true,
      draw: (f, a) => `<rect fill="${f}" x="12" y="14" width="26" height="9" rx="2"/><rect fill="${f}" x="21" y="28" width="31" height="9" rx="2"/><rect fill="${a}" x="12" y="42" width="26" height="9" rx="2"/>` },
    { id: "frame-fold", name: "Frame fold", tagline: "A frame that folds into play.", reason: "A single folded frame leaves a play triangle in its center. The outer square gives it a distinctive silhouette, while the diagonal fold suggests making something from footage.", recommended: true,
      draw: (f, a) => `<path fill="${f}" fill-rule="evenodd" d="M14 14h36v36H14Zm9 8v20l19-10Z"/><path fill="${a}" d="M14 14h36L37 27Z"/>` },
    { id: "stacked-play", name: "Stacked play", tagline: "Layers with a little momentum.", reason: "A solid play tile floats over a second offset tile. It brings the current layered identity closer to video without relying on film perforations or tiny details.",
      draw: (f, a) => `<path d="M13 30v19a3 3 0 0 0 3 3h24" fill="none" stroke="${a}" stroke-width="6" stroke-linejoin="round"/><path fill="${f}" fill-rule="evenodd" d="M25 12h24a3 3 0 0 1 3 3v24a3 3 0 0 1-3 3H25a3 3 0 0 1-3-3V15a3 3 0 0 1 3-3Zm7 8v14l12-7Z"/>` },
    { id: "edit-brackets", name: "Edit brackets", tagline: "An in point. An out point. A story.", reason: "Two bold trim brackets frame a simple play triangle. It is the most explicit editing-tool idea, with enough negative space to stay readable when the UI gets small.",
      draw: (f, a) => `<path d="M22 15h-8v34h8m20-34h8v34h-8" fill="none" stroke="${f}" stroke-width="6" stroke-linecap="square"/><path fill="${a}" d="m27 21 15 11-15 11Z"/>` },
    { id: "match-cut", name: "Match cut", tagline: "Two moments, perfectly joined.", reason: "Two opposing blocks share a diagonal splice. The join is the idea: separate moments becoming a single sequence. It is abstract, compact, and especially strong in one color.",
      draw: (f, a) => `<path fill="${f}" d="M14 14h36L14 50Z"/><path fill="${a}" d="M50 24v26H24Z"/>` },
    { id: "ribbon-loop", name: "Ribbon loop", tagline: "A continuous ribbon of scenes.", reason: "Two substantial interlocking links suggest a connected sequence rather than a single clip. The ribbon feels continuous and works as an emblem without a tile behind it.",
      draw: (f, a) => `<path d="m28 38-5 5a8 8 0 0 1-11-11l12-12a8 8 0 0 1 11 0" fill="none" stroke="${f}" stroke-width="8" stroke-linecap="round"/><path d="m36 26 5-5a8 8 0 0 1 11 11L40 44a8 8 0 0 1-11 0" fill="none" stroke="${a}" stroke-width="8" stroke-linecap="round"/><path d="m25 39 14-14" stroke="${f}" stroke-width="7" stroke-linecap="round"/>` },
    { id: "split-frame", name: "Split frame", tagline: "The moment between before and after.", reason: "A solid panel sits beside an open frame: a minimal before-and-after view. Just two pieces suggest the transformation from raw footage to an edited scene.",
      draw: (f, a) => `<path fill="${f}" d="M13 14h16v36H13Z"/><path fill="${a}" d="M35 14h16v36H35v-7h9V21h-9Z"/>` },
    { id: "forward-tiles", name: "Forward tiles", tagline: "Frames moving into the next scene.", reason: "Two offset chevrons create a sequence of frames moving right. Their shared rhythm reads as forward motion, while a stepped outline helps distinguish it from a generic play button.",
      draw: (f, a) => `<path fill="${f}" d="m12 16 23 16-23 16V37l8-5-8-5Z"/><path fill="${a}" d="m31 16 23 16-23 16V37l8-5-8-5Z"/>` },
    { id: "cue", name: "Cue", tagline: "Press play. Find your next moment.", reason: "A circular cue with a small tail forms a subtle Q for seQuence. The play-shaped counter makes it unmistakably about video; the ring gives it a different silhouette from the square directions.",
      draw: (f, a) => `<path fill="${f}" fill-rule="evenodd" d="M32 11a21 21 0 1 1 0 42 21 21 0 0 1 0-42Zm-6 10v22l18-11Z"/><path fill="${a}" d="m42 40 12 12-8 3-10-12Z"/>` },
  ];
  const defaults = Object.freeze({ version: 1, concept: "edit-brackets", bg: "#635BFF", fg: "#FFFFFF", accent: "#BDB8FF", twoTone: false, transparent: false, scale: 100, radius: 16, canvas: "dark" });
  const palettes = [
    { name: "Sequence violet", bg: "#635BFF", fg: "#FFFFFF", accent: "#BDB8FF" },
    { name: "Ink & paper", bg: "#F0ECE3", fg: "#222328", accent: "#79746D" },
    { name: "Signal orange", bg: "#F25C36", fg: "#FFF6EB", accent: "#FFC19F" },
    { name: "Electric mint", bg: "#C4F271", fg: "#1A3429", accent: "#527C3F" },
    { name: "Midnight blue", bg: "#152B55", fg: "#DFECFF", accent: "#80B6FF" },
  ];
  function normalize(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Choose a valid Sequence icon recipe.");
    if (value.version !== 1) throw new Error("This recipe version is not supported.");
    const result = { ...defaults };
    if (!concepts.some((c) => c.id === value.concept)) throw new Error("The recipe uses an unknown direction.");
    result.concept = value.concept;
    for (const key of ["bg", "fg", "accent"]) {
      if (typeof value[key] !== "string" || !/^#[0-9a-f]{6}$/i.test(value[key])) throw new Error(`The ${key} color needs a six-digit hex value.`);
      result[key] = value[key].toUpperCase();
    }
    for (const key of ["twoTone", "transparent"]) {
      if (typeof value[key] !== "boolean") throw new Error(`The ${key} setting must be true or false.`);
      result[key] = value[key];
    }
    for (const [key, min, max] of [["scale", 64, 112], ["radius", 0, 32]]) {
      if (!Number.isInteger(value[key]) || value[key] < min || value[key] > max) throw new Error(`The ${key} setting is out of range.`);
      result[key] = value[key];
    }
    if (["dark", "light", "grid"].includes(value.canvas)) result.canvas = value.canvas;
    return result;
  }
  function glyph(state, options = {}) {
    const concept = concepts.find((c) => c.id === state.concept);
    const foreground = options.foreground || state.fg;
    const accent = options.foreground || (state.twoTone ? state.accent : foreground);
    const scale = (options.maskable ? Math.min(state.scale, 75) : state.scale) / 100;
    return `<g transform="translate(32 32) scale(${scale}) translate(-32 -32)">${concept.draw(foreground, accent)}</g>`;
  }
  function svg(state, options = {}) {
    const size = options.preview ? "100%" : (options.size || 64);
    const transparent = options.transparent ?? state.transparent;
    const corner = options.maskable ? 0 : state.radius;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64"><title>Sequence — ${concepts.find((c) => c.id === state.concept).name}</title>${transparent ? "" : `<rect width="64" height="64" rx="${corner}" fill="${state.bg}"/>`}${glyph(state, options)}</svg>`;
  }
  function contrast(a, b) {
    const luminance = (hex) => {
      const channels = hex.slice(1).match(/../g).map((v) => parseInt(v, 16) / 255).map((v) => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
      return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
    };
    const values = [luminance(a), luminance(b)].sort((a, b) => b - a);
    return (values[0] + .05) / (values[1] + .05);
  }
  window.SequenceStudio = { concepts, defaults, palettes, normalize, glyph, svg, contrast };
})();
