"use client";

import { useOverlayEditorStore } from "@/common/overlay/editor/overlay-editor-store";
import { cn } from "@/common/utils";
import { OVERLAY_WIDGET_TYPES, OVERLAY_WIDGETS } from "@/components/overlay/widget-registry";
import { SegmentedControl, SegmentedOption } from "@/components/ui/segmented-control";
import { createOverlayElement } from "@ssr/common/overlay/overlay-presets";
import { MAX_OVERLAY_ELEMENTS } from "@ssr/common/schemas/overlay/overlay-layout";
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, Lock, LockOpen, Trash2 } from "lucide-react";
import { ReactNode, useState } from "react";

const GROUPS = ["Player", "Song", "Score", "Other"] as const;

function AddWidgetMenu({ onAdded }: { onAdded: () => void }) {
  const addElement = useOverlayEditorStore(state => state.addElement);
  const count = useOverlayEditorStore(state => state.layout.elements.length);
  const full = count >= MAX_OVERLAY_ELEMENTS;

  return (
    <div className="flex flex-col gap-5">
      {GROUPS.map(group => (
        <section key={group} className="flex flex-col gap-2">
          <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{group}</h3>
          <div className="grid grid-cols-2 gap-2">
            {OVERLAY_WIDGET_TYPES.filter(type => OVERLAY_WIDGETS[type].group === group).map(type => {
              const Icon = OVERLAY_WIDGETS[type].icon;
              return (
                <button
                  key={type}
                  type="button"
                  disabled={full}
                  onClick={() => {
                    addElement(createOverlayElement(type, { z: count }));
                    onAdded();
                  }}
                  className="ring-border hover:bg-hover hover:ring-primary/50 flex cursor-pointer flex-col items-center gap-1.5 rounded-lg px-2 py-3 text-xs ring-1 transition-colors disabled:cursor-default disabled:opacity-40"
                >
                  <Icon className="text-muted-foreground size-5" />
                  {OVERLAY_WIDGETS[type].label}
                </button>
              );
            })}
          </div>
        </section>
      ))}
      {full && (
        <p className="text-destructive text-xs">
          An overlay can have {MAX_OVERLAY_ELEMENTS} widgets at most.
        </p>
      )}
    </div>
  );
}

function LayerButton({
  label,
  disabled,
  active,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      className={cn(
        "hover:bg-hover cursor-pointer rounded p-1 transition-colors disabled:cursor-default disabled:opacity-30",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
      onClick={event => {
        event.stopPropagation();
        onClick();
      }}
    >
      {children}
    </button>
  );
}

function LayerList({ onAdd }: { onAdd: () => void }) {
  const elements = useOverlayEditorStore(state => state.layout.elements);
  const selectedIds = useOverlayEditorStore(state => state.selectedIds);
  const toggleSelection = useOverlayEditorStore(state => state.toggleSelection);
  const select = useOverlayEditorStore(state => state.select);
  const updateElement = useOverlayEditorStore(state => state.updateElement);
  const moveElement = useOverlayEditorStore(state => state.moveElement);
  const duplicateElements = useOverlayEditorStore(state => state.duplicateElements);
  const removeElements = useOverlayEditorStore(state => state.removeElements);

  // Top of the list is the front of the overlay
  const layers = [...elements].sort((a, b) => b.z - a.z);

  if (layers.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center gap-3 py-10 text-center text-sm">
        <p>Nothing on this overlay yet.</p>
        <button type="button" onClick={onAdd} className="text-primary cursor-pointer hover:underline">
          Add a widget
        </button>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {layers.map((element, index) => {
        const Icon = OVERLAY_WIDGETS[element.type].icon;
        const selected = selectedIds.includes(element.id);
        return (
          <li
            key={element.id}
            onClick={event =>
              event.shiftKey || event.ctrlKey || event.metaKey
                ? toggleSelection(element.id)
                : select(element.id)
            }
            className={cn(
              "group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
              selected ? "bg-primary/15 ring-primary/60 ring-1" : "hover:bg-hover",
              !element.visible && "opacity-50"
            )}
          >
            <Icon className="text-muted-foreground size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{OVERLAY_WIDGETS[element.type].label}</span>
            {/* Secondary actions only show on hover or when selected, to keep the list calm */}
            <div className={cn("hidden items-center group-hover:flex", selected && "flex")}>
              <LayerButton
                label="Bring forward"
                disabled={index === 0}
                onClick={() => moveElement(element.id, "up")}
              >
                <ArrowUp className="size-3.5" />
              </LayerButton>
              <LayerButton
                label="Send backward"
                disabled={index === layers.length - 1}
                onClick={() => moveElement(element.id, "down")}
              >
                <ArrowDown className="size-3.5" />
              </LayerButton>
              <LayerButton label="Duplicate" onClick={() => duplicateElements([element.id])}>
                <Copy className="size-3.5" />
              </LayerButton>
              <LayerButton label="Delete" onClick={() => removeElements([element.id])}>
                <Trash2 className="size-3.5" />
              </LayerButton>
            </div>
            <LayerButton
              label={element.locked ? "Unlock" : "Lock"}
              active={element.locked}
              onClick={() => updateElement(element.id, { locked: !element.locked })}
            >
              {element.locked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
            </LayerButton>
            <LayerButton
              label={element.visible ? "Hide" : "Show"}
              onClick={() => updateElement(element.id, { visible: !element.visible })}
            >
              {element.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
            </LayerButton>
          </li>
        );
      })}
    </ul>
  );
}

export default function LayersPanel() {
  const count = useOverlayEditorStore(state => state.layout.elements.length);
  const [tab, setTab] = useState<"layers" | "add">("layers");

  return (
    <div className="flex h-full flex-col">
      <div className="border-border border-b p-3">
        <SegmentedControl>
          <SegmentedOption isActive={tab === "layers"} onClick={() => setTab("layers")}>
            Layers ({count})
          </SegmentedOption>
          <SegmentedOption isActive={tab === "add"} onClick={() => setTab("add")}>
            Add widget
          </SegmentedOption>
        </SegmentedControl>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {tab === "layers" ? (
          <LayerList onAdd={() => setTab("add")} />
        ) : (
          <AddWidgetMenu onAdded={() => setTab("layers")} />
        )}
      </div>
    </div>
  );
}
