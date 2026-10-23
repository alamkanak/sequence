import type { Clip, Project } from "../core/model";
import type { Pose } from "./scene";
import type { AlignmentGuide } from "./alignment";
import { resizeClip, resizeHandles, type ResizeHandle } from "./transform";

/** Snap the dragged handle, retaining opposite-edge/center and aspect constraints. */
export function snapResize(
  clip: Clip,
  project: Project,
  initial: Pose,
  handle: ResizeHandle,
  dx: number,
  dy: number,
  keepAspect: boolean,
  fromCenter: boolean,
  tolerance: number,
): { patch: Partial<Clip>; guides: AlignmentGuide[] } {
  const resize = (x: number, y: number) =>
    resizeClip(clip, project, initial, handle, x, y, keepAspect, fromCenter);
  const point = (patch: Partial<Clip>) =>
    resizeHandles({
      ...initial,
      x: initial.x + (patch.x! - clip.x) * project.width,
      y: initial.y + (patch.y! - clip.y) * project.height,
      w: (initial.w * patch.width!) / clip.width,
      h: (initial.h * patch.height!) / clip.height,
    }).find((h) => h.id === handle.id)!;
  let patch = resize(dx, dy);
  const before = point(patch);
  const candidates: AlignmentGuide[] = [];
  for (const axis of ["x", "y"] as const) {
    const extent = axis === "x" ? project.width : project.height;
    const value = [0, extent / 2, extent].sort(
      (a, b) => Math.abs(a - before[axis]) - Math.abs(b - before[axis]),
    )[0];
    if (Math.abs(value - before[axis]) <= tolerance)
      candidates.push({ axis, value });
  }
  const aspect = keepAspect && handle.sx !== 0 && handle.sy !== 0;
  if (!aspect && handle.sx && handle.sy) {
    patch = resize(
      dx +
        (candidates.find((g) => g.axis === "x")?.value ?? before.x) -
        before.x,
      dy +
        (candidates.find((g) => g.axis === "y")?.value ?? before.y) -
        before.y,
    );
  } else {
    // A side handle or proportional corner has one degree of freedom. Project
    // each potential snap onto that direction instead of distorting dimensions.
    const cs = Math.cos(initial.angle),
      sn = Math.sin(initial.angle);
    const mx = aspect
      ? (handle.sx * initial.w) / (fromCenter ? 2 : 1)
      : handle.sx;
    const my = aspect
      ? (handle.sy * initial.h) / (fromCenter ? 2 : 1)
      : handle.sy;
    const vx = mx * cs - my * sn,
      vy = mx * sn + my * cs;
    const base = aspect ? patch.width! / clip.width - 1 : 0;
    const at = (n: number) =>
      aspect
        ? resize(vx * (base + n), vy * (base + n))
        : resize(dx + vx * n, dy + vy * n);
    const next = point(at(1));
    let distance = Infinity;
    for (const { axis, value } of candidates) {
      const slope = next[axis] - before[axis];
      if (Math.abs(slope) < 1e-7) continue;
      const candidate = at((value - before[axis]) / slope);
      const endpoint = point(candidate);
      const travel = Math.hypot(endpoint.x - before.x, endpoint.y - before.y);
      if (
        Math.abs(endpoint[axis] - value) < 1e-5 &&
        travel <= tolerance * 1.5 &&
        travel < distance
      ) {
        patch = candidate;
        distance = travel;
      }
    }
  }
  const after = point(patch);
  const moved = {
    x: Math.abs(after.x - handle.x),
    y: Math.abs(after.y - handle.y),
  };
  return {
    patch,
    guides: candidates.filter(
      ({ axis, value }) =>
        moved[axis] > 1e-7 && Math.abs(after[axis] - value) < 1e-5,
    ),
  };
}
