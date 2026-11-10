import type { OverlayConnectionSettings } from "@ssr/common/schemas/overlay/overlay-connection-settings";
import type { OverlayElement } from "@ssr/common/schemas/overlay/overlay-element";
import type { OverlayLayout } from "@ssr/common/schemas/overlay/overlay-layout";
import { MAX_OVERLAY_ELEMENTS } from "@ssr/common/schemas/overlay/overlay-layout";
import type { UserOverlay } from "@ssr/common/schemas/response/user/overlay";
import { create } from "zustand";

type Snapshot = { layout: OverlayLayout; settings: OverlayConnectionSettings };

const MAX_HISTORY = 100;
/** Changes with the same key within this time (typing in a field, dragging a slider) are one undo step. */
const COALESCE_MS = 1000;

type OverlayEditorState = {
  overlayId: string | undefined;
  name: string;
  layout: OverlayLayout;
  settings: OverlayConnectionSettings;
  /** Every selected element. */
  selectedIds: string[];
  /** The selected element when exactly one is selected, what the properties panel edits. */
  selectedId: string | undefined;
  /** Increases on every change, so autosave knows there is something to save. */
  version: number;
  past: Snapshot[];
  future: Snapshot[];
  lastCoalesce: { key: string; at: number } | undefined;

  load: (overlay: UserOverlay) => void;
  select: (id: string | undefined) => void;
  setSelection: (ids: string[]) => void;
  /** Adds the element to the selection, or removes it when it is already selected. */
  toggleSelection: (id: string) => void;
  rename: (name: string) => void;
  setSettings: (settings: OverlayConnectionSettings) => void;
  /** Starts an undo step for a gesture, call once when it starts. */
  beginGesture: () => void;
  updateElement: (id: string, patch: Partial<OverlayElement>, coalesceKey?: string) => void;
  /** Changes the same fields on several elements as one undo step. */
  updateElements: (ids: string[], patch: Partial<OverlayElement>) => void;
  /** Updates an element as part of a gesture that already has its undo step. */
  updateElementInGesture: (id: string, patch: Partial<OverlayElement>) => void;
  /** Updates several elements as part of a gesture that already has its undo step. */
  updateElementsInGesture: (patches: Record<string, Partial<OverlayElement>>) => void;
  /** Moves elements with the keyboard, repeated presses are one undo step. */
  nudge: (patches: Record<string, Partial<OverlayElement>>) => void;
  addElement: (element: OverlayElement) => void;
  duplicateElements: (ids: string[]) => void;
  removeElements: (ids: string[]) => void;
  /** Moves an element up or down in the stacking order. */
  moveElement: (id: string, direction: "up" | "down") => void;
  replaceLayout: (layout: OverlayLayout) => void;
  undo: () => void;
  redo: () => void;
};

function withHistory(state: OverlayEditorState, coalesceKey?: string): Partial<OverlayEditorState> {
  const now = Date.now();
  if (coalesceKey && state.lastCoalesce?.key === coalesceKey && now - state.lastCoalesce.at < COALESCE_MS) {
    return { lastCoalesce: { key: coalesceKey, at: now }, future: [] };
  }
  return {
    past: [...state.past, { layout: state.layout, settings: state.settings }].slice(-MAX_HISTORY),
    future: [],
    lastCoalesce: coalesceKey ? { key: coalesceKey, at: now } : undefined,
  };
}

/** Renumbers `z` to match the order of the array, so the stacking order is always 0..n-1. */
function normalizeZ(elements: OverlayElement[]): OverlayElement[] {
  return elements.map((element, index) => ({ ...element, z: index }));
}

function selection(ids: string[]): Pick<OverlayEditorState, "selectedIds" | "selectedId"> {
  return { selectedIds: ids, selectedId: ids.length === 1 ? ids[0] : undefined };
}

/** Keeps the ids that still exist in the layout. */
function existingIds(ids: string[], layout: OverlayLayout): string[] {
  return ids.filter(id => layout.elements.some(element => element.id === id));
}

function patchElements(
  layout: OverlayLayout,
  getPatch: (element: OverlayElement) => Partial<OverlayElement> | undefined
): OverlayLayout {
  return {
    ...layout,
    elements: layout.elements.map(element => {
      const patch = getPatch(element);
      return patch ? ({ ...element, ...patch } as OverlayElement) : element;
    }),
  };
}

const EMPTY_LAYOUT: OverlayLayout = { version: 1, canvas: { w: 1920, h: 1080 }, elements: [] };

export const useOverlayEditorStore = create<OverlayEditorState>((set, get) => ({
  overlayId: undefined,
  name: "",
  layout: EMPTY_LAYOUT,
  settings: { playerId: "", useRealTimeData: true, dataClient: "HTTPSiraStatus" },
  ...selection([]),
  version: 0,
  past: [],
  future: [],
  lastCoalesce: undefined,

  load: overlay =>
    set({
      overlayId: overlay.id,
      name: overlay.name,
      layout: overlay.layout,
      settings: overlay.settings,
      ...selection([]),
      version: 0,
      past: [],
      future: [],
      lastCoalesce: undefined,
    }),

  select: id => set(selection(id ? [id] : [])),

  setSelection: ids => set(selection(ids)),

  toggleSelection: id =>
    set(state =>
      selection(
        state.selectedIds.includes(id)
          ? state.selectedIds.filter(other => other !== id)
          : [...state.selectedIds, id]
      )
    ),

  rename: name => set(state => ({ name, version: state.version + 1 })),

  setSettings: settings =>
    set(state => ({ ...withHistory(state, "settings"), settings, version: state.version + 1 })),

  beginGesture: () => set(state => ({ ...withHistory(state), lastCoalesce: undefined })),

  updateElement: (id, patch, coalesceKey) =>
    set(state => ({
      ...withHistory(state, coalesceKey),
      layout: patchElements(state.layout, element => (element.id === id ? patch : undefined)),
      version: state.version + 1,
    })),

  updateElements: (ids, patch) =>
    set(state => ({
      ...withHistory(state),
      layout: patchElements(state.layout, element => (ids.includes(element.id) ? patch : undefined)),
      version: state.version + 1,
    })),

  updateElementInGesture: (id, patch) =>
    set(state => ({
      layout: patchElements(state.layout, element => (element.id === id ? patch : undefined)),
      version: state.version + 1,
    })),

  updateElementsInGesture: patches =>
    set(state => ({
      layout: patchElements(state.layout, element => patches[element.id]),
      version: state.version + 1,
    })),

  nudge: patches =>
    set(state => ({
      ...withHistory(state, "nudge"),
      layout: patchElements(state.layout, element => patches[element.id]),
      version: state.version + 1,
    })),

  addElement: element =>
    set(state => {
      if (state.layout.elements.length >= MAX_OVERLAY_ELEMENTS) {
        return state;
      }
      return {
        ...withHistory(state),
        layout: { ...state.layout, elements: normalizeZ([...state.layout.elements, element]) },
        ...selection([element.id]),
        version: state.version + 1,
      };
    }),

  duplicateElements: ids =>
    set(state => {
      const sources = state.layout.elements.filter(element => ids.includes(element.id));
      if (sources.length === 0 || state.layout.elements.length + sources.length > MAX_OVERLAY_ELEMENTS) {
        return state;
      }
      const copies = sources.map(
        source =>
          ({
            ...source,
            id: crypto.randomUUID(),
            offset: { x: source.offset.x + 24, y: source.offset.y + 24 },
          }) as OverlayElement
      );
      // Copies go on top of everything, in their original order
      const elements = normalizeZ([...[...state.layout.elements].sort((a, b) => a.z - b.z), ...copies]);
      return {
        ...withHistory(state),
        layout: { ...state.layout, elements },
        ...selection(copies.map(copy => copy.id)),
        version: state.version + 1,
      };
    }),

  removeElements: ids =>
    set(state => ({
      ...withHistory(state),
      layout: {
        ...state.layout,
        elements: normalizeZ(state.layout.elements.filter(element => !ids.includes(element.id))),
      },
      ...selection(state.selectedIds.filter(id => !ids.includes(id))),
      version: state.version + 1,
    })),

  moveElement: (id, direction) =>
    set(state => {
      const sorted = [...state.layout.elements].sort((a, b) => a.z - b.z);
      const index = sorted.findIndex(element => element.id === id);
      const target = direction === "up" ? index + 1 : index - 1;
      if (index === -1 || target < 0 || target >= sorted.length) {
        return state;
      }
      [sorted[index], sorted[target]] = [sorted[target], sorted[index]];
      return {
        ...withHistory(state),
        layout: { ...state.layout, elements: normalizeZ(sorted) },
        version: state.version + 1,
      };
    }),

  replaceLayout: layout =>
    set(state => ({
      ...withHistory(state),
      layout,
      ...selection([]),
      version: state.version + 1,
    })),

  undo: () => {
    const { past, layout, settings, future, selectedIds } = get();
    const previous = past[past.length - 1];
    if (!previous) {
      return;
    }
    set(state => ({
      past: past.slice(0, -1),
      future: [{ layout, settings }, ...future],
      layout: previous.layout,
      settings: previous.settings,
      ...selection(existingIds(selectedIds, previous.layout)),
      lastCoalesce: undefined,
      version: state.version + 1,
    }));
  },

  redo: () => {
    const { future, layout, settings, past, selectedIds } = get();
    const next = future[0];
    if (!next) {
      return;
    }
    set(state => ({
      past: [...past, { layout, settings }],
      future: future.slice(1),
      layout: next.layout,
      settings: next.settings,
      ...selection(existingIds(selectedIds, next.layout)),
      lastCoalesce: undefined,
      version: state.version + 1,
    }));
  },
}));
