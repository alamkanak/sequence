/* Typography-led PNG assets. Text is rendered with the bundled Manrope font. */
(() => {
  const copy = Object.freeze({
    headline: ["Your browser.", "Your video studio."],
    subheading: "Edit by hand or with your AI agent.",
    price: "100% free",
    benefits: ["No installation", "No account", "No watermark", "No uploads"],
  });
  function canvas(width, height) {
    const result = document.createElement("canvas");
    result.width = width;
    result.height = height;
    return result;
  }
  function rounded(context, x, y, width, height, radius, fill, stroke) {
    context.beginPath();
    context.roundRect(x, y, width, height, radius);
    if (fill) { context.fillStyle = fill; context.fill(); }
    if (stroke) { context.strokeStyle = stroke; context.lineWidth = 1; context.stroke(); }
  }
  function text(context, value, x, y, { size = 24, weight = 500, color = "#171820", spacing = 0, align = "left" } = {}) {
    context.font = `${weight} ${size}px StudioManrope`;
    context.fontKerning = "normal";
    context.letterSpacing = `${spacing}px`;
    context.textAlign = align;
    context.fillStyle = color;
    context.fillText(value, x, y);
    return context.measureText(value);
  }
  function mix(a, b, amount) {
    const channels = (hex) => hex.slice(1).match(/../g).map(value => parseInt(value, 16));
    const left = channels(a), right = channels(b);
    return "#" + left.map((value, index) => Math.round(value + (right[index] - value) * amount).toString(16).padStart(2, "0")).join("");
  }
  async function mark(state) {
    const url = URL.createObjectURL(new Blob([window.SequenceStudio.svg(state, { size: 512 })], { type: "image/svg+xml" }));
    try {
      const image = new Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error("Could not render the Sequence mark."));
        image.src = url;
      });
      return image;
    } finally { URL.revokeObjectURL(url); }
  }
  function trimTransparent(source) {
    const context = source.getContext("2d");
    const { data } = context.getImageData(0, 0, source.width, source.height);
    let left = source.width, top = source.height, right = -1, bottom = -1;
    for (let y = 0; y < source.height; y++) {
      for (let x = 0; x < source.width; x++) {
        if (data[(y * source.width + x) * 4 + 3] === 0) continue;
        left = Math.min(left, x); top = Math.min(top, y);
        right = Math.max(right, x); bottom = Math.max(bottom, y);
      }
    }
    if (right < left) return source;
    const result = canvas(right - left + 1, bottom - top + 1);
    result.getContext("2d").drawImage(source, left, top, result.width, result.height, 0, 0, result.width, result.height);
    return result;
  }
  function wordmark(state, theme, image) {
    const result = canvas(1000, 240);
    const context = result.getContext("2d");
    const ink = theme === "dark" ? "#F6F5FA" : "#191A23";
    context.font = "750 144px StudioManrope";
    context.letterSpacing = "-5px";
    const measure = context.measureText("Sequence");
    const iconSize = 166;
    const gap = 34;
    const left = (result.width - iconSize - gap - measure.width) / 2;
    context.drawImage(image, left, 37, iconSize, iconSize);
    // Center the letter body; including q's descender pushes the word visibly upward.
    const capitals = context.measureText("H");
    const baseline = 120 + (capitals.actualBoundingBoxAscent - capitals.actualBoundingBoxDescent) / 2;
    text(context, "Sequence", left + iconSize + gap, baseline, { size: 144, weight: 750, spacing: -5, color: ink });
    // A snug export aligns the visible logo with the README's left margin.
    return trimTransparent(result);
  }
  function pointer(context, x, y) {
    context.save();
    context.translate(x, y);
    context.beginPath();
    context.moveTo(0, 0); context.lineTo(0, 29); context.lineTo(8, 22);
    context.lineTo(14, 35); context.lineTo(21, 32); context.lineTo(15, 19); context.lineTo(26, 18); context.closePath();
    context.fillStyle = "#FFFFFF"; context.strokeStyle = "#242333"; context.lineWidth = 2;
    context.fill(); context.stroke(); context.restore();
  }
  function editor(context, x, y, state, theme) {
    const dark = theme === "dark";
    const surface = dark ? "#262631" : "#FFFFFF";
    const stroke = dark ? "#383844" : "#E1DFEC";
    context.save();
    context.shadowColor = dark ? "#00000035" : "#39325116";
    context.shadowBlur = 32; context.shadowOffsetY = 15;
    rounded(context, x, y, 350, 240, 15, surface);
    context.restore();
    rounded(context, x, y, 350, 240, 15, null, stroke);
    for (let dot = 0; dot < 3; dot++) {
      context.beginPath(); context.arc(x + 17 + dot * 13, y + 17, 3, 0, Math.PI * 2);
      context.fillStyle = dark ? "#62616E" : "#D3CFDE"; context.fill();
    }
    text(context, "sequence", x + 175, y + 21, { size: 11, weight: 600, color: dark ? "#A5A2B5" : "#8B879A", align: "center" });
    // A minimal scene and editable timeline communicate the product at thumbnail size.
    const gradient = context.createLinearGradient(x, y + 35, x + 350, y + 152);
    gradient.addColorStop(0, mix(state.bg, "#FFFFFF", .72));
    gradient.addColorStop(1, mix(state.bg, "#FFFFFF", .24));
    rounded(context, x + 10, y + 35, 330, 110, 5, gradient);
    context.save();
    context.beginPath(); context.rect(x + 10, y + 35, 330, 110); context.clip();
    context.fillStyle = "#FFFFFF9A"; context.beginPath(); context.arc(x + 255, y + 67, 20, 0, Math.PI * 2); context.fill();
    context.fillStyle = mix(state.bg, "#231C44", .4);
    context.beginPath(); context.moveTo(x + 10, y + 145); context.lineTo(x + 10, y + 116);
    context.bezierCurveTo(x + 65, y + 127, x + 75, y + 80, x + 126, y + 98);
    context.bezierCurveTo(x + 184, y + 145, x + 231, y + 89, x + 340, y + 119);
    context.lineTo(x + 340, y + 145); context.closePath(); context.fill();
    context.restore();
    const track = dark ? "#34333F" : "#F1EFF7";
    for (let row = 0; row < 3; row++) rounded(context, x + 12, y + 159 + row * 23, 326, 17, 4, track);
    rounded(context, x + 12, y + 159, 143, 17, 4, mix(state.bg, "#FFFFFF", .42));
    rounded(context, x + 161, y + 159, 109, 17, 4, mix(state.bg, "#FFFFFF", .65));
    rounded(context, x + 12, y + 182, 83, 17, 4, state.bg);
    rounded(context, x + 102, y + 182, 190, 17, 4, mix(state.bg, "#FFFFFF", .2));
    rounded(context, x + 12, y + 205, 280, 17, 4, dark ? "#4C796D" : "#BBDBD0");
    context.fillStyle = dark ? "#FEF9EF" : "#43385E";
    context.fillRect(x + 121, y + 153, 2, 74);
    context.beginPath(); context.moveTo(x + 117, y + 151); context.lineTo(x + 127, y + 151); context.lineTo(x + 122, y + 157); context.closePath(); context.fill();
    pointer(context, x + 64, y + 176);
    context.save();
    context.shadowBlur = 15; context.shadowOffsetY = 5; context.shadowColor = "#30245424";
    rounded(context, x + 225, y + 220, 108, 35, 10, dark ? "#E3DCFF" : "#2C2544");
    context.restore();
    text(context, "AI agent", x + 279, y + 243, { size: 14, weight: 650, color: dark ? "#292139" : "#FFFFFF", align: "center" });
  }
  function social(state, theme, image) {
    const result = canvas(1200, 630);
    const context = result.getContext("2d");
    const dark = theme === "dark";
    const background = dark ? "#13141C" : "#F8F7FC";
    const ink = dark ? "#F7F5FD" : "#1D1C29";
    const muted = dark ? "#A8A5BA" : "#696477";
    const accent = window.SequenceStudio.contrast(state.bg, background) > 3 ? state.bg : dark ? "#B8A9FF" : "#635BDB";
    context.fillStyle = background; context.fillRect(0, 0, 1200, 630);
    context.drawImage(image, 64, 52, 43, 43);
    text(context, "Sequence", 120, 85, { size: 33, weight: 750, spacing: -1.2, color: ink });
    rounded(context, 976, 53, 160, 40, 20, dark ? "#2B263E" : "#ECE8FB");
    context.beginPath(); context.arc(998, 73, 3.5, 0, Math.PI * 2); context.fillStyle = dark ? "#BDAAFF" : "#6C50DC"; context.fill();
    text(context, copy.price, 1012, 80, { size: 18, weight: 700, color: dark ? "#D6C9FF" : "#5A42B7" });
    text(context, copy.headline[0], 60, 215, { size: 72, weight: 750, spacing: -3, color: ink });
    text(context, copy.headline[1], 60, 301, { size: 72, weight: 750, spacing: -3, color: accent });
    text(context, copy.subheading, 64, 358, { size: 25, weight: 500, spacing: -.3, color: muted });
    editor(context, 786, 165, state, theme);
    context.fillStyle = dark ? "#302E3F" : "#DFDCE9"; context.fillRect(64, 464, 1072, 1);
    const positions = [64, 341, 605, 874];
    for (const [index, benefit] of copy.benefits.entries()) {
      const x = positions[index];
      context.beginPath(); context.arc(x + 9, 510, 9, 0, Math.PI * 2); context.fillStyle = dark ? "#302A44" : "#EAE4F8"; context.fill();
      context.beginPath(); context.moveTo(x + 5, 510); context.lineTo(x + 8, 513); context.lineTo(x + 13, 507);
      context.strokeStyle = dark ? "#C7B4F6" : "#8063B6"; context.lineWidth = 1.7; context.lineCap = "round"; context.stroke();
      text(context, benefit, x + 29, 517, { size: 20, weight: 600, spacing: -.3, color: ink });
    }
    text(context, "Your files stay on your device.", 64, 584, { size: 17, weight: 500, color: muted });
    text(context, "alamkanak.github.io/sequence", 1136, 584, { size: 17, weight: 500, spacing: -.2, color: muted, align: "right" });
    return result;
  }
  async function render(input) {
    const state = window.SequenceStudio.normalize(input);
    await window.SequenceStudioFont.ready();
    const image = await mark(state);
    return {
      wordmarkLight: wordmark(state, "light", image),
      wordmarkDark: wordmark(state, "dark", image),
      socialLight: social(state, "light", image),
      socialDark: social(state, "dark", image),
    };
  }
  async function png(source) {
    const blob = await new Promise((resolve, reject) => source.toBlob(value => value ? resolve(value) : reject(new Error("PNG export failed.")), "image/png"));
    return new Uint8Array(await blob.arrayBuffer());
  }
  window.SequenceStudioBrand = { copy, render, png };
})();
