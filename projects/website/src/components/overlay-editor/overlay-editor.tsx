"use client";

import { useOverlayEditorStore } from "@/common/overlay/editor/overlay-editor-store";
import { useEditorHotkeys } from "@/common/overlay/editor/use-editor-hotkeys";
import { useOverlayAutosave } from "@/common/overlay/editor/use-overlay-autosave";
import LiveOverlayRuntime from "@/common/overlay/live-overlay-runtime";
import MockOverlayRuntime from "@/common/overlay/mock-overlay-runtime";
import type { MockScenario } from "@/common/overlay/mock/mock-overlay-data";
import EditorCanvas from "@/components/overlay-editor/editor-canvas";
import EditorToolbar, { type EditorMode } from "@/components/overlay-editor/editor-toolbar";
import LayersPanel from "@/components/overlay-editor/layers-panel";
import PropertiesPanel from "@/components/overlay-editor/properties-panel";
import type { UserOverlay } from "@ssr/common/schemas/response/user/overlay";
import { useState } from "react";

/**
 * The full editor for one overlay. The overlay is copied into the editor store once and autosaved from there.
 */
export default function OverlayEditor({ overlay }: { overlay: UserOverlay }) {
  // Load before the first render of the children so they never see the previous overlay
  const [loadedId, setLoadedId] = useState<string>();
  if (loadedId !== overlay.id) {
    useOverlayEditorStore.getState().load(overlay);
    setLoadedId(overlay.id);
  }

  const settings = useOverlayEditorStore(state => state.settings);
  const status = useOverlayAutosave();
  const [mode, setMode] = useState<EditorMode>("mock");
  const [scenario, setScenario] = useState<MockScenario>("playing");
  useEditorHotkeys();

  if (loadedId !== overlay.id) {
    return null;
  }

  const canvas = <EditorCanvas />;

  return (
    <div className="flex h-screen w-screen flex-col">
      <EditorToolbar
        status={status}
        mode={mode}
        onModeChange={setMode}
        scenario={scenario}
        onScenarioChange={setScenario}
      />
      <div className="grid min-h-0 flex-1 grid-cols-[17rem_1fr_19rem]">
        <aside className="border-border bg-card min-h-0 border-r">
          <LayersPanel />
        </aside>
        <main className="min-h-0 min-w-0">
          {mode === "mock" ? (
            <MockOverlayRuntime scenario={scenario} playerId={settings.playerId}>
              {canvas}
            </MockOverlayRuntime>
          ) : (
            <LiveOverlayRuntime settings={settings} editing>
              {canvas}
            </LiveOverlayRuntime>
          )}
        </main>
        <aside className="border-border bg-card min-h-0 border-l">
          <PropertiesPanel />
        </aside>
      </div>
    </div>
  );
}
