import { useSyncExternalStore } from "react";
import { notifications } from "./notifications";
import {
  editProject,
  emptyProject,
  validateProject,
  type Project,
  type Edit,
} from "./model";
export interface State {
  project: Project;
  selected: string | null;
  tab: "media" | "elements";
  error: string;
  dirty: boolean;
}
let state: State = {
  project: emptyProject(),
  selected: null,
  tab: "media",
  error: "",
  dirty: false,
};
const listeners = new Set<() => void>();
const past: Project[] = [];
const future: Project[] = [];
let previewDepth = 0;
const emit = () => listeners.forEach((l) => l());
export const store = {
  get: () => state,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  patch: (patch: Partial<State>) => {
    state = { ...state, ...patch };
    // Preserve error details for inline forms while presenting global notices
    // through the shared, dismissible toast system.
    if (patch.error) notifications.show(patch.error, { tone: "error" });
    emit();
  },
  replace: (project: Project, history = true) => {
    const next = validateProject(project);
    if (history && !previewDepth) {
      past.push(state.project);
      if (past.length > 80) past.shift();
    }
    if (!previewDepth) future.length = 0;
    state = { ...state, project: next, dirty: true };
    emit();
  },
  apply: (edits: Edit[], expected?: number, dryRun = false) => {
    if (expected !== undefined && expected !== state.project.revision)
      throw new Error(
        "Project changed. Inspect the current revision and retry.",
      );
    const p = editProject(state.project, edits);
    if (!dryRun) store.replace(p);
    return p;
  },
  undo: () => {
    const p = past.pop();
    if (p) {
      future.push(state.project);
      state = {
        ...state,
        project: { ...p, revision: state.project.revision + 1 },
        dirty: true,
      };
      emit();
    }
  },
  redo: () => {
    const p = future.pop();
    if (p) {
      past.push(state.project);
      state = {
        ...state,
        project: { ...p, revision: state.project.revision + 1 },
        dirty: true,
      };
      emit();
    }
  },
  // Live controls can render drafts without adding undo entries or losing redo.
  preview: (change: () => void) => {
    previewDepth++;
    try {
      change();
    } finally {
      previewDepth--;
    }
  },
  beginHistoryGroup: () => {
    const before = state.project,
      history = [...past];
    return () => {
      past.length = 0;
      past.push(...history.slice(-79), before);
      future.length = 0;
    };
  },
  clearHistory: () => {
    past.length = 0;
    future.length = 0;
  },
  canUndo: () => past.length > 0,
  canRedo: () => future.length > 0,
  safe: (fn: () => void) => {
    try {
      fn();
    } catch (e) {
      store.patch({ error: e instanceof Error ? e.message : String(e) });
    }
  },
};
export const useStore = () => useSyncExternalStore(store.subscribe, store.get);
export const useProject = () => useStore().project;
