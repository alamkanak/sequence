import { track, uid, type Clip, type Edit, type Project } from "./model";

/** An independent snapshot: later edits/deletions never mutate copied content. */
export class TimelineClipboard {
  private clip: Clip | null = null;
  get populated() {
    return this.clip !== null;
  }
  copy(clip: Clip) {
    this.clip = structuredClone(clip);
  }
  paste(
    project: Project,
    time: number,
  ): { edits: Edit[]; selected: string } | null {
    if (!this.clip) return null;
    const clip = structuredClone(this.clip);
    if (clip.assetId && !project.assets.some((a) => a.id === clip.assetId))
      throw new Error(
        "The copied media is missing from this project. Import it before pasting.",
      );
    const type = clip.kind === "audio" ? "audio" : "visual";
    const target =
      project.tracks.find(
        (t) => t.id === clip.trackId && !t.locked && t.type === type,
      ) || project.tracks.find((t) => t.type === type && !t.locked);
    const destination =
      target || track(type === "audio" ? "Audio" : "Video", type);
    clip.id = uid();
    clip.trackId = destination.id;
    clip.start = Math.max(0, Math.round(time * project.fps) / project.fps);
    const edits: Edit[] = target
      ? []
      : [{ op: "add_track", track: destination }];
    edits.push({ op: "add_clip", clip });
    return { edits, selected: clip.id };
  }
}
