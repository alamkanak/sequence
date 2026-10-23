import { emptyProject, newClip, track } from "./model";
import { importFiles } from "./actions";
import { store } from "./store";
import { transport } from "../engine/transport";
export async function loadStressProject() {
  const finishHistory = store.beginHistoryGroup();
  try {
    transport.pause();
    store.replace(emptyProject());
    const response = await fetch(
      `${import.meta.env.BASE_URL}demo/benchmark-1080.mp4`,
    );
    if (!response.ok) throw new Error("Benchmark fixture not found");
    await importFiles([
      new File([await response.blob()], "benchmark-1080.mp4", {
        type: "video/mp4",
      }),
    ]);
    const musicResponse = await fetch(
      `${import.meta.env.BASE_URL}demo/ambient.wav`,
    );
    await importFiles([
      new File([await musicResponse.blob()], "ambient.wav", {
        type: "audio/wav",
      }),
    ]);
    const p = store.get().project;
    const tracks = [
      ...Array.from({ length: 5 }, (_, i) => track(`Elements ${i + 1}`)),
      track("Video A"),
      track("Video B"),
      track("Audio", "audio"),
    ];
    const clips = [];
    for (let layer = 0; layer < 2; layer++)
      for (let i = 0; i < 100; i++) {
        const c = newClip(p, "video", tracks[5 + layer].id, i * 6, p.assets[0]);
        c.duration = 6;
        c.opacity = layer === 0 ? 0.5 : 1;
        c.fadeIn = layer === 0 ? 0.5 : 0;
        clips.push(c);
      }
    for (let layer = 0; layer < 5; layer++)
      for (let i = 0; i < (layer === 4 ? 59 : 60); i++) {
        const c = newClip(
          p,
          layer % 2 ? "shape" : "text",
          tracks[layer].id,
          i * 10,
        );
        c.duration = 3;
        c.y = 0.2 + layer * 0.14;
        c.width = 0.3;
        c.height = 0.08;
        c.text = `Layer ${layer + 1}`;
        c.fontSize = 40;
        c.enter = "fade";
        clips.push(c);
      }
    const music = newClip(p, "audio", tracks[7].id, 0, p.assets[1]);
    music.volume = 0.6;
    music.fadeIn = 0.5;
    music.fadeOut = 0.5;
    clips.push(music);
    store.replace({
      ...p,
      name: "Benchmark · 500 segments / 1080p",
      width: 1920,
      height: 1080,
      fps: 30,
      initialized: true,
      tracks,
      clips,
    });
    store.patch({ selected: null });
    transport.seek(0);
  } finally {
    finishHistory();
  }
}
