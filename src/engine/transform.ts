import type { Clip, Project } from "../core/model";
import type { Pose } from "./scene";
export interface ResizeHandle {
  id: string;
  x: number;
  y: number;
  sx: number;
  sy: number;
}
const handles = [
  ["nw", -1, -1],
  ["n", 0, -1],
  ["ne", 1, -1],
  ["e", 1, 0],
  ["se", 1, 1],
  ["s", 0, 1],
  ["sw", -1, 1],
  ["w", -1, 0],
] as const;
export function resizeHandles(v: Pose): ResizeHandle[] {
  const cs = Math.cos(v.angle),
    sn = Math.sin(v.angle);
  return handles.map(([id, sx, sy]) => {
    const x = ((sx + 1) / 2 - v.anchorX) * v.w;
    const y = ((sy + 1) / 2 - v.anchorY) * v.h;
    return { id, sx, sy, x: v.x + x * cs - y * sn, y: v.y + x * sn + y * cs };
  });
}
export function resizeCursor(handle: ResizeHandle, angle: number) {
  const direction = Math.round(
    (angle + Math.atan2(handle.sy, handle.sx)) / (Math.PI / 4),
  );
  return (["ew", "nwse", "ns", "nesw"] as const)[((direction % 4) + 4) % 4];
}
export function rotationHandle(v: Pose, gap: number) {
  const top = resizeHandles(v).find((h) => h.id === "n")!;
  return {
    x: top.x + Math.sin(v.angle) * gap,
    y: top.y - Math.cos(v.angle) * gap,
  };
}
/** Resize in the element's rotated axes, keeping the opposite edge/corner fixed. */
export function resizeClip(
  clip: Clip,
  project: Project,
  initial: Pose,
  handle: ResizeHandle,
  dx: number,
  dy: number,
  keepAspect = true,
  fromCenter = false,
): Partial<Clip> {
  const cs = Math.cos(initial.angle),
    sn = Math.sin(initial.angle);
  const localX = dx * cs + dy * sn,
    localY = -dx * sn + dy * cs;
  const minW = initial.w / clip.width / project.width;
  const minH = initial.h / clip.height / project.height;
  let w = handle.sx
    ? Math.max(minW, initial.w + handle.sx * localX * (fromCenter ? 2 : 1))
    : initial.w;
  let h = handle.sy
    ? Math.max(minH, initial.h + handle.sy * localY * (fromCenter ? 2 : 1))
    : initial.h;
  if (keepAspect && handle.sx && handle.sy) {
    const factor =
      Math.abs(w / initial.w - 1) >= Math.abs(h / initial.h - 1)
        ? w / initial.w
        : h / initial.h;
    const scale = Math.max(minW / initial.w, minH / initial.h, factor);
    w = initial.w * scale;
    h = initial.h * scale;
  }
  const shiftX = handle.sx
    ? (initial.anchorX - (fromCenter ? 0.5 : handle.sx < 0 ? 1 : 0)) *
      (w - initial.w)
    : 0;
  const shiftY = handle.sy
    ? (initial.anchorY - (fromCenter ? 0.5 : handle.sy < 0 ? 1 : 0)) *
      (h - initial.h)
    : 0;
  return {
    width: (clip.width * w) / initial.w,
    height: (clip.height * h) / initial.h,
    x: clip.x + (shiftX * cs - shiftY * sn) / project.width,
    y: clip.y + (shiftX * sn + shiftY * cs) / project.height,
  };
}
