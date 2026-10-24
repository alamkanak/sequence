(() => {
  const { concepts, defaults, palettes, normalize, svg, contrast } = window.SequenceStudio;
  const { download, buildKit } = window.SequenceStudioExport;
  const $ = (id) => document.getElementById(id);
  const storageKey = "sequence-icon-studio-v1";
  let state = { ...defaults };
  let noticeTimer;
  let previewTimer;
  let previewTicket = 0;
  let canSave = true;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) state = normalize(JSON.parse(saved));
  } catch {
    canSave = false;
  }
  const fromHash = () => {
    const id = location.hash.slice(1);
    if (concepts.some((c) => c.id === id)) state.concept = id;
  };
  fromHash();
  function notice(message) {
    clearTimeout(noticeTimer);
    $("notice-text").textContent = message;
    $("notice").hidden = false;
    noticeTimer = setTimeout(() => { $("notice").hidden = true; }, 8000);
  }
  $("dismiss-notice").addEventListener("click", () => { $("notice").hidden = true; clearTimeout(noticeTimer); });
  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      canSave = true;
    } catch {
      canSave = false;
    }
    $("save-status").textContent = canSave ? "Saved on this device" : "Session only · save a recipe to keep changes";
  }
  function patch(changes) {
    state = normalize({ ...state, ...changes });
    render();
    save();
  }
  function choose(id) {
    patch({ concept: id });
    // Supports direct links to a direction without requiring a server-side router.
    try { history.replaceState(null, "", `#${id}`); } catch { /* file:// browser restriction */ }
  }
  for (const [index, concept] of concepts.entries()) {
    const option = document.createElement("option");
    option.value = concept.id;
    option.textContent = `${String(index + 1).padStart(2, "0")} · ${concept.name}`;
    $("direction").append(option);
    const card = document.createElement("button");
    card.type = "button";
    card.className = "concept-card";
    card.dataset.concept = concept.id;
    card.setAttribute("aria-label", `${String(index + 1).padStart(2, "0")} ${concept.name}. ${concept.tagline}`);
    card.setAttribute("aria-pressed", "false");
    card.innerHTML = `<div class="mb-5 flex items-start justify-between"><span class="font-mono text-[10px] text-zinc-500">${String(index + 1).padStart(2, "0")}</span>${concept.recommended ? '<span class="rounded bg-[#b7a5ff]/10 px-1.5 py-0.5 text-[8px] tracking-wide text-[#b7a5ff]">SHORTLIST</span>' : ""}</div><div data-concept-icon class="mb-5 size-12"></div><h3 class="text-xs font-medium text-zinc-200">${concept.name}</h3><p class="mt-2 min-h-8 text-[10px] leading-relaxed text-zinc-500">${concept.tagline}</p>`;
    card.addEventListener("click", () => choose(concept.id));
    $("concepts").append(card);
  }
  for (const palette of palettes) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "flex size-7 items-center justify-center rounded-full border border-white/15 transition hover:scale-110";
    button.setAttribute("aria-label", `${palette.name} palette`);
    button.title = palette.name;
    button.style.backgroundColor = palette.bg;
    const dot = document.createElement("span");
    dot.className = "size-2 rounded-full";
    dot.style.backgroundColor = palette.fg;
    button.append(dot);
    button.addEventListener("click", () => patch({ bg: palette.bg, fg: palette.fg, accent: palette.accent }));
    $("palettes").append(button);
  }
  for (const size of [16, 24, 32, 48]) {
    const item = document.createElement("div");
    item.innerHTML = `<div class="mb-2 flex h-14 items-center justify-center rounded-lg bg-[#0f1014]"><div data-size-dark="${size}" style="width:${size}px;height:${size}px"></div></div><div class="flex h-14 items-center justify-center rounded-lg bg-[#f5f4f8]"><div data-size-light="${size}" style="width:${size}px;height:${size}px"></div></div><p class="mt-3 text-center font-mono text-[10px] text-zinc-500">${size} px</p>`;
    $("size-tests").append(item);
  }
  function renderBrandPreviews(snapshot) {
    clearTimeout(previewTimer);
    const ticket = ++previewTicket;
    previewTimer = setTimeout(async () => {
      try {
        const brand = await window.SequenceStudioBrand.render(snapshot);
        if (ticket !== previewTicket) return;
        const readme = brand.wordmarkDark.cloneNode();
        readme.getContext("2d").drawImage(brand.wordmarkDark, 0, 0);
        for (const [id, source, full] of [
          ["readme-wordmark", readme, false],
          ["wordmark-light-preview", brand.wordmarkLight, false],
          ["wordmark-dark-preview", brand.wordmarkDark, false],
          ["social-light-preview", brand.socialLight, true],
          ["social-dark-preview", brand.socialDark, true],
        ]) {
          source.className = full ? "h-auto w-full" : "h-full w-full object-contain";
          source.setAttribute("aria-hidden", "true");
          $(id).replaceChildren(source);
        }
      } catch (error) {
        if (ticket === previewTicket) notice(`Brand preview could not load: ${error.message}`);
      }
    }, 60);
  }
  function render() {
    const concept = concepts.find((c) => c.id === state.concept);
    const markup = svg(state, { preview: true });
    for (const id of ["hero-icon", "header-mark", "browser-mark", "landing-mark", "mcp-mark"]) {
      const container = $(id);
      // MCP assets use an opaque tile for predictable visibility in client chrome.
      container.innerHTML = id === "mcp-mark" ? svg(state, { preview: true, transparent: false }) : markup;
      container.querySelector("svg").setAttribute("aria-hidden", "true");
    }
    renderBrandPreviews({ ...state });
    document.querySelectorAll("[data-size-dark], [data-size-light]").forEach((element) => { element.innerHTML = markup; element.querySelector("svg").setAttribute("aria-hidden", "true"); });
    document.querySelectorAll("[data-concept]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.concept === state.concept));
      button.querySelector("[data-concept-icon]").innerHTML = svg({ ...state, concept: button.dataset.concept }, { preview: true });
      button.querySelector("svg").setAttribute("aria-hidden", "true");
    });
    $("direction").value = state.concept;
    for (const key of ["bg", "fg", "accent"]) {
      $(`${key}-color`).value = state[key];
      $(`${key}-hex`).value = state[key];
    }
    for (const key of ["two-tone", "transparent"]) $(key).checked = state[key === "two-tone" ? "twoTone" : key];
    $("scale").value = state.scale;
    $("scale-value").textContent = `${state.scale}%`;
    $("radius").value = state.radius;
    $("radius-value").textContent = `${state.radius} px`;
    $("radius").disabled = state.transparent;
    $("hero-name").textContent = `${String(concepts.indexOf(concept) + 1).padStart(2, "0")} — ${concept.name}`;
    $("concept-tagline").textContent = concept.tagline;
    $("concept-reason").textContent = concept.reason;
    const ratio = Math.min(contrast(state.fg, state.bg), state.twoTone ? contrast(state.accent, state.bg) : Infinity);
    $("contrast").textContent = state.transparent ? "Transparent mark: compare both light and dark backgrounds below. MCP and app exports keep a tile." : `${ratio.toFixed(1)}:1 minimum mark / tile contrast. ${ratio < 3 ? "Try stronger contrast for tiny favicons." : "A useful starting point for small sizes."}`;
    $("contrast").classList.toggle("text-amber-300", !state.transparent && ratio < 3);
    $("canvas").classList.toggle("preview-grid", state.canvas === "dark");
    $("canvas").classList.toggle("checkerboard", state.canvas === "grid");
    $("canvas").style.backgroundColor = state.canvas === "light" ? "#F0EFF5" : "#1c1d24";
    document.querySelectorAll("[data-canvas]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.canvas === state.canvas)));
    $("studio-favicon").href = `data:image/svg+xml,${encodeURIComponent(svg(state))}`;
  }
  $("direction").addEventListener("change", (event) => choose(event.target.value));
  for (const key of ["bg", "fg", "accent"]) {
    $(`${key}-color`).addEventListener("input", (event) => patch({ [key]: event.target.value }));
    $(`${key}-hex`).addEventListener("change", (event) => {
      let value = event.target.value.trim();
      if (!value.startsWith("#")) value = `#${value}`;
      if (/^#[0-9a-f]{3}$/i.test(value)) value = `#${value.slice(1).split("").map((c) => c + c).join("")}`;
      if (!/^#[0-9a-f]{6}$/i.test(value)) {
        event.target.value = state[key];
        notice("Use a color such as #635BFF or #FFF.");
        return;
      }
      patch({ [key]: value.toUpperCase() });
    });
  }
  for (const key of ["scale", "radius"]) $(key).addEventListener("input", (event) => patch({ [key]: Number(event.target.value) }));
  $("two-tone").addEventListener("change", (event) => patch({ twoTone: event.target.checked }));
  $("transparent").addEventListener("change", (event) => patch({ transparent: event.target.checked }));
  document.querySelectorAll("[data-canvas]").forEach((button) => button.addEventListener("click", () => patch({ canvas: button.dataset.canvas })));
  $("reset").addEventListener("click", () => { const { concept } = state; patch({ ...defaults, concept }); notice("Palette and geometry reset. Your direction is still selected."); });
  $("save-recipe").addEventListener("click", () => download(new Blob([JSON.stringify(state, null, 2) + "\n"], { type: "application/json" }), `sequence-${state.concept}.recipe.json`));
  $("load-recipe").addEventListener("click", () => $("recipe-file").click());
  $("recipe-file").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      if (file.size > 64 * 1024) throw new Error("Choose a studio recipe JSON smaller than 64 KB.");
      const next = normalize(JSON.parse(await file.text()));
      choose(next.concept);
      patch(next);
      notice("Recipe loaded. You can keep editing or export the asset kit.");
    } catch (error) {
      notice(error instanceof SyntaxError ? "This file is not valid recipe JSON." : error.message);
    } finally {
      event.target.value = "";
    }
  });
  $("download-svg").addEventListener("click", () => download(new Blob([svg(state)], { type: "image/svg+xml" }), `sequence-${state.concept}.svg`));
  $("open-export").addEventListener("click", () => {
    const concept = concepts.find((c) => c.id === state.concept);
    $("export-summary").textContent = `${concept.name} · ${state.bg} / ${state.fg}${state.twoTone ? ` / ${state.accent}` : ""} · ${state.scale}% mark size · ${state.transparent ? "transparent tile" : `${state.radius}px corners`}. All assets are generated from these settings, right here.`;
    $("export-dialog").showModal();
  });
  $("close-export").addEventListener("click", () => $("export-dialog").close());
  $("export-dialog").addEventListener("click", (event) => { if (event.target === $("export-dialog")) { const box = event.target.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) event.target.close(); } });
  $("export-zip").addEventListener("click", async () => {
    const button = $("export-zip");
    if (button.disabled) return;
    button.disabled = true;
    button.textContent = "Generating assets…";
    try {
      const result = await buildKit(state, (message) => { $("export-progress").textContent = message; });
      download(result.blob, result.filename);
      $("export-progress").textContent = "Ready. Check your downloads for the ZIP and integration guide.";
      notice("Asset kit exported. INTEGRATION.md inside the ZIP explains each project placement.");
    } catch (error) {
      $("export-progress").textContent = "Export failed. Your settings are still saved.";
      notice(error.message);
    } finally {
      button.disabled = false;
      button.textContent = "Download asset kit (.zip)";
    }
  });
  window.addEventListener("hashchange", () => { fromHash(); render(); save(); });
  render();
  $("save-status").textContent = canSave ? "Saved on this device" : "Session only · save a recipe to keep changes";
})();
