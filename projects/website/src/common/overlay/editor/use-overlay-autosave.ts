"use client";

import { useOverlayEditorStore } from "@/common/overlay/editor/overlay-editor-store";
import { updateUserOverlay } from "@/common/overlay/overlay-api";
import { useEffect, useRef, useState } from "react";

const AUTOSAVE_DELAY_MS = 800;

export type SaveStatus = "saved" | "unsaved" | "saving" | "error";

/**
 * Saves the overlay shortly after it stops changing. Saving pushes the change to every OBS page showing it.
 */
export function useOverlayAutosave(): SaveStatus {
  const version = useOverlayEditorStore(state => state.version);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const savedVersion = useRef(0);
  const saving = useRef(false);

  useEffect(() => {
    if (version === 0 || version === savedVersion.current) {
      return;
    }
    setStatus("unsaved");

    const save = async () => {
      // One request at a time, the newest state is saved once the running one is done
      if (saving.current) {
        timer = setTimeout(save, AUTOSAVE_DELAY_MS);
        return;
      }
      const { overlayId, name, layout, settings, version: currentVersion } = useOverlayEditorStore.getState();
      if (!overlayId) {
        return;
      }
      saving.current = true;
      setStatus("saving");
      try {
        await updateUserOverlay(overlayId, { name, layout, settings });
        savedVersion.current = currentVersion;
        setStatus(useOverlayEditorStore.getState().version === currentVersion ? "saved" : "unsaved");
      } catch (error) {
        console.error("Failed to save the overlay", error);
        setStatus("error");
      } finally {
        saving.current = false;
      }
    };

    let timer = setTimeout(save, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [version]);

  // Warn before leaving with changes that are not saved
  useEffect(() => {
    if (status === "saved") {
      return;
    }
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [status]);

  return status;
}
