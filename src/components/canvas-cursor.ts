const classes = {
  default: "cursor-default",
  move: "cursor-move",
  grab: "cursor-grab",
  grabbing: "cursor-grabbing",
  crosshair: "cursor-crosshair",
  notAllowed: "cursor-not-allowed",
  col: "cursor-col-resize",
  ew: "cursor-ew-resize",
  ns: "cursor-ns-resize",
  nwse: "cursor-nwse-resize",
  nesw: "cursor-nesw-resize",
} as const;
export type CanvasCursor = keyof typeof classes;
/** Change only the cursor class; pointer movement never needs a React render. */
export function setCanvasCursor(
  element: HTMLCanvasElement,
  cursor: CanvasCursor,
) {
  if (element.classList.contains(classes[cursor])) return;
  element.classList.remove(...Object.values(classes));
  element.classList.add(classes[cursor]);
}
