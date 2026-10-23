import type { Project } from "../core/model";
import { corners, type Pose } from "./scene";
export interface AlignmentGuide {
  axis: "x" | "y";
  value: number;
}
/** Screen-sized tolerance is supplied in project pixels by the preview. */
export function snapAlignment(v: Pose, project: Project, tolerance: number) {
  const points = corners(v);
  const guides: AlignmentGuide[] = [];
  const snap = (axis: "x" | "y", extent: number) => {
    const min = Math.min(...points.map((p) => p[axis]));
    const max = Math.max(...points.map((p) => p[axis]));
    const candidates = [
      { source: (min + max) / 2, target: extent / 2 },
      { source: min, target: 0 },
      { source: max, target: extent },
    ].sort(
      (a, b) => Math.abs(a.target - a.source) - Math.abs(b.target - b.source),
    );
    const best = candidates[0];
    if (Math.abs(best.target - best.source) > tolerance) return 0;
    guides.push({ axis, value: best.target });
    return best.target - best.source;
  };
  return {
    dx: snap("x", project.width),
    dy: snap("y", project.height),
    guides,
  };
}
