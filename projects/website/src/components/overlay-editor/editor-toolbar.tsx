"use client";

import { useOverlayEditorStore } from "@/common/overlay/editor/overlay-editor-store";
import type { SaveStatus } from "@/common/overlay/editor/use-overlay-autosave";
import { MOCK_SCENARIOS, type MockScenario } from "@/common/overlay/mock/mock-overlay-data";
import { cn } from "@/common/utils";
import { Button } from "@/components/ui/button";
import { SegmentedControl, SegmentedOption } from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cloneOverlayLayout, OVERLAY_PRESETS } from "@ssr/common/overlay/overlay-presets";
import { ArrowLeft, LayoutTemplate, Link2, Redo2, Undo2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export type EditorMode = "mock" | "live";

const STATUS: Record<SaveStatus, { label: string; dot: string }> = {
  saved: { label: "Saved", dot: "bg-green-500" },
  unsaved: { label: "Unsaved changes", dot: "bg-yellow-500" },
  saving: { label: "Saving…", dot: "bg-yellow-500 animate-pulse" },
  error: { label: "Save failed", dot: "bg-red-500" },
};

type EditorToolbarProps = {
  status: SaveStatus;
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  scenario: MockScenario;
  onScenarioChange: (scenario: MockScenario) => void;
};

export default function EditorToolbar({
  status,
  mode,
  onModeChange,
  scenario,
  onScenarioChange,
}: EditorToolbarProps) {
  const overlayId = useOverlayEditorStore(state => state.overlayId);
  const name = useOverlayEditorStore(state => state.name);
  const rename = useOverlayEditorStore(state => state.rename);
  const undo = useOverlayEditorStore(state => state.undo);
  const redo = useOverlayEditorStore(state => state.redo);
  const canUndo = useOverlayEditorStore(state => state.past.length > 0);
  const canRedo = useOverlayEditorStore(state => state.future.length > 0);
  const replaceLayout = useOverlayEditorStore(state => state.replaceLayout);
  const hasElements = useOverlayEditorStore(state => state.layout.elements.length > 0);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/overlay?id=${overlayId}`);
      toast.success("Copied the OBS browser source URL");
    } catch (error) {
      console.error("Failed to copy the URL", error);
      toast.error("Could not copy the URL");
    }
  };

  return (
    <header className="border-border bg-card grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b px-3">
      <div className="flex min-w-0 items-center gap-1">
        <Button
          asChild
          size="icon"
          variant="ghost"
          title="All overlays"
          className="border-transparent bg-transparent"
        >
          <Link href="/overlay/editor">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <input
          className="hover:bg-hover focus:bg-muted focus:ring-primary/50 max-w-64 min-w-0 rounded-md px-2 py-1 font-semibold outline-hidden focus:ring-2"
          value={name}
          maxLength={64}
          aria-label="Overlay name"
          onChange={event => rename(event.target.value)}
        />
        <span
          className="text-muted-foreground ml-2 flex shrink-0 items-center gap-1.5 text-xs"
          role="status"
          title="Changes are saved automatically and show up in OBS right away"
        >
          <span className={cn("size-2 rounded-full", STATUS[status].dot)} />
          {STATUS[status].label}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button size="icon" variant="outline" title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={undo}>
          <Undo2 className="size-4" />
        </Button>
        <Button size="icon" variant="outline" title="Redo (Ctrl+Shift+Z)" disabled={!canRedo} onClick={redo}>
          <Redo2 className="size-4" />
        </Button>
        <Select
          value=""
          onValueChange={presetId => {
            const preset = OVERLAY_PRESETS.find(candidate => candidate.id === presetId);
            if (!preset) {
              return;
            }
            if (
              hasElements &&
              !window.confirm(`Replace the layout with "${preset.name}"? You can undo this.`)
            ) {
              return;
            }
            replaceLayout(cloneOverlayLayout(preset.layout));
          }}
        >
          <SelectTrigger className="w-44">
            <LayoutTemplate className="size-4 shrink-0" />
            <SelectValue placeholder="Start from preset" />
          </SelectTrigger>
          <SelectContent>
            {OVERLAY_PRESETS.map(preset => (
              <SelectItem key={preset.id} value={preset.id}>
                {preset.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-end gap-2">
        <SegmentedControl>
          <SegmentedOption isActive={mode === "mock"} onClick={() => onModeChange("mock")}>
            Preview data
          </SegmentedOption>
          <SegmentedOption isActive={mode === "live"} onClick={() => onModeChange("live")}>
            Live game
          </SegmentedOption>
        </SegmentedControl>
        {mode === "mock" && (
          <Select
            value={scenario}
            onValueChange={value => {
              const next = MOCK_SCENARIOS.find(candidate => candidate.id === value);
              if (next) {
                onScenarioChange(next.id);
              }
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MOCK_SCENARIOS.map(item => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button variant="primary" onClick={copyUrl}>
          <Link2 className="mr-1.5 size-4" />
          Copy OBS URL
        </Button>
      </div>
    </header>
  );
}
