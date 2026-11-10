"use client";

import { useOverlayEditorStore } from "@/common/overlay/editor/overlay-editor-store";
import { useEffect } from "react";

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

/**
 * Undo, redo, select all, duplicate, delete and arrow key nudging.
 */
export function useEditorHotkeys() {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (isTyping(event.target)) {
        return;
      }
      const store = useOverlayEditorStore.getState();
      const modifier = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (modifier && key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          store.redo();
        } else {
          store.undo();
        }
        return;
      }
      if (modifier && key === "y") {
        event.preventDefault();
        store.redo();
        return;
      }
      if (modifier && key === "a") {
        event.preventDefault();
        store.setSelection(
          store.layout.elements.filter(element => element.visible).map(element => element.id)
        );
        return;
      }

      const selected = store.layout.elements.filter(element => store.selectedIds.includes(element.id));
      if (selected.length === 0) {
        return;
      }
      const ids = selected.map(element => element.id);

      if (modifier && key === "d") {
        event.preventDefault();
        store.duplicateElements(ids);
      } else if (key === "delete" || key === "backspace") {
        event.preventDefault();
        store.removeElements(ids);
      } else if (key === "escape") {
        store.select(undefined);
      } else if (key.startsWith("arrow")) {
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        const dx = key === "arrowleft" ? -step : key === "arrowright" ? step : 0;
        const dy = key === "arrowup" ? -step : key === "arrowdown" ? step : 0;
        const patches: Record<string, Partial<(typeof selected)[number]>> = {};
        for (const element of selected) {
          if (element.locked) {
            continue;
          }
          // Offsets are measured inward from the anchor, so on the right/bottom edges the signs flip
          const flipX = element.anchor.includes("right") ? -1 : 1;
          const flipY = element.anchor.includes("bottom") ? -1 : 1;
          patches[element.id] = {
            offset: { x: element.offset.x + dx * flipX, y: element.offset.y + dy * flipY },
          };
        }
        // Holding an arrow key repeats, which should be one undo step
        store.nudge(patches);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
