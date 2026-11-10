"use client";

import { measureElementBounds } from "@/common/overlay/editor/measure";
import { useOverlayEditorStore } from "@/common/overlay/editor/overlay-editor-store";
import { changeAnchor, clampScale } from "@/common/overlay/layout-math";
import { cn } from "@/common/utils";
import { OVERLAY_WIDGETS } from "@/components/overlay/widget-registry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { OverlayAnchor } from "@ssr/common/schemas/overlay/overlay-anchor";
import {
  MAX_OVERLAY_TEXT_LENGTH,
  OverlayWidgetTypes,
  type OverlayElement,
} from "@ssr/common/schemas/overlay/overlay-element";
import { ReactNode } from "react";

const ANCHOR_GRID: OverlayAnchor[][] = [
  ["top-left", "top", "top-right"],
  ["left", "center", "right"],
  ["bottom-left", "bottom", "bottom-right"],
];

const SCALE_PRESETS = [50, 75, 100, 150, 200];

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="border-border flex flex-col gap-3 border-b px-4 py-4 last:border-b-0">
      <div>
        <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{title}</h3>
        {hint && <p className="text-muted-foreground/80 mt-0.5 text-xs">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

/** A number input with its label inside, so rows of them stay compact. */
function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  suffix,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  suffix?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "border-border bg-muted focus-within:ring-primary/50 hover:border-primary/50 flex h-9 items-center gap-2 rounded-md border px-3 text-sm focus-within:ring-2",
        disabled && "opacity-50"
      )}
    >
      <span className="text-muted-foreground w-3 shrink-0 text-xs font-medium">{label}</span>
      <input
        type="number"
        className="min-w-0 flex-1 [appearance:textfield] bg-transparent text-right outline-hidden [&::-webkit-inner-spin-button]:appearance-none"
        value={Number.isFinite(value) ? value : ""}
        placeholder="auto"
        min={min}
        max={max}
        disabled={disabled}
        onChange={event => {
          const next = event.target.valueAsNumber;
          if (Number.isFinite(next)) {
            onChange(Math.min(max, Math.max(min, next)));
          }
        }}
      />
      {suffix && <span className="text-muted-foreground text-xs">{suffix}</span>}
    </label>
  );
}

function SizeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | "auto";
  onChange: (value: number | "auto") => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <NumberField
        label={label}
        value={value === "auto" ? NaN : value}
        min={1}
        max={4000}
        suffix="px"
        disabled={value === "auto"}
        onChange={onChange}
      />
      <label className="text-muted-foreground flex items-center gap-2 text-xs">
        <Switch checked={value === "auto"} onCheckedChange={auto => onChange(auto ? "auto" : 200)} />
        Fit content
      </label>
    </div>
  );
}

function ElementProperties({ element }: { element: OverlayElement }) {
  const updateElement = useOverlayEditorStore(state => state.updateElement);
  const key = (field: string) => `${element.id}:${field}`;
  const percent = Math.round(element.scale * 100);

  const setAnchor = (anchor: OverlayAnchor) => {
    const bounds = measureElementBounds(element.id);
    if (!bounds) {
      updateElement(element.id, { anchor });
      return;
    }
    const placement = changeAnchor(element, { w: bounds.width, h: bounds.height }, anchor);
    updateElement(element.id, {
      anchor,
      offset: { x: Math.round(placement.offset.x), y: Math.round(placement.offset.y) },
    });
  };

  const Icon = OVERLAY_WIDGETS[element.type].icon;

  return (
    <>
      <div className="border-border flex items-center gap-2 border-b px-4 py-3">
        <Icon className="text-muted-foreground size-4" />
        <h2 className="font-semibold">{OVERLAY_WIDGETS[element.type].label}</h2>
      </div>

      {element.type === OverlayWidgetTypes.Text && (
        <Section title="Text">
          <Input
            value={element.options.text}
            maxLength={MAX_OVERLAY_TEXT_LENGTH}
            onChange={event =>
              updateElement(element.id, { options: { text: event.target.value } }, key("text"))
            }
          />
        </Section>
      )}

      {(element.type === OverlayWidgetTypes.PlayerPp ||
        element.type === OverlayWidgetTypes.PlayerBlPp ||
        element.type === OverlayWidgetTypes.ScorePp ||
        element.type === OverlayWidgetTypes.ScoreBlPp) && (
        <Section title="Display">
          <label className="flex items-center justify-between text-sm">
            Show platform
            <Switch
              checked={element.options.showPlatform ?? true}
              onCheckedChange={showPlatform =>
                updateElement(element.id, { options: { ...element.options, showPlatform } })
              }
            />
          </label>
        </Section>
      )}

      {element.type === OverlayWidgetTypes.PbDelta && (
        <Section title="Display">
          <Select
            value={element.options.mode}
            onValueChange={mode =>
              updateElement(element.id, {
                options: { ...element.options, mode: mode === "pbAccuracy" ? "pbAccuracy" : "delta" },
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="delta">Difference to your PB</SelectItem>
              <SelectItem value="pbAccuracy">Accuracy of your PB</SelectItem>
            </SelectContent>
          </Select>
          <NumberField
            label="."
            suffix="decimals"
            value={element.options.precision}
            min={0}
            max={3}
            onChange={precision =>
              updateElement(
                element.id,
                { options: { ...element.options, precision: Math.round(precision) } },
                key("precision")
              )
            }
          />
          <label className="flex items-center justify-between text-sm">
            Show label
            <Switch
              checked={element.options.showLabel}
              onCheckedChange={showLabel =>
                updateElement(element.id, { options: { ...element.options, showLabel } })
              }
            />
          </label>
        </Section>
      )}

      <Section title="Position" hint="Measured from the anchor, so it holds at any resolution.">
        <div className="flex items-start gap-4">
          <div className="grid w-20 shrink-0 grid-cols-3 gap-1 rounded-md">
            {ANCHOR_GRID.flat().map(anchor => (
              <button
                key={anchor}
                type="button"
                title={anchor}
                aria-label={`Anchor ${anchor}`}
                aria-pressed={element.anchor === anchor}
                onClick={() => setAnchor(anchor)}
                className={cn(
                  "aspect-square cursor-pointer rounded-sm border transition-colors",
                  element.anchor === anchor
                    ? "border-primary bg-primary"
                    : "border-border bg-muted hover:bg-hover"
                )}
              />
            ))}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <NumberField
              label="X"
              suffix="px"
              value={element.offset.x}
              min={-4000}
              max={4000}
              onChange={x => updateElement(element.id, { offset: { ...element.offset, x } }, key("x"))}
            />
            <NumberField
              label="Y"
              suffix="px"
              value={element.offset.y}
              min={-4000}
              max={4000}
              onChange={y => updateElement(element.id, { offset: { ...element.offset, y } }, key("y"))}
            />
          </div>
        </div>
      </Section>

      <Section title="Size">
        <div className="grid grid-cols-2 gap-3">
          <SizeField
            label="W"
            value={element.size.w}
            onChange={w => updateElement(element.id, { size: { ...element.size, w } }, key("w"))}
          />
          <SizeField
            label="H"
            value={element.size.h}
            onChange={h => updateElement(element.id, { size: { ...element.size, h } }, key("h"))}
          />
        </div>
        <NumberField
          label="S"
          suffix="%"
          value={percent}
          min={10}
          max={500}
          onChange={next => updateElement(element.id, { scale: clampScale(next / 100) }, key("scale"))}
        />
        <div className="flex flex-wrap gap-1">
          {SCALE_PRESETS.map(preset => (
            <button
              key={preset}
              type="button"
              onClick={() => updateElement(element.id, { scale: preset / 100 })}
              className={cn(
                "cursor-pointer rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                percent === preset
                  ? "border-foreground bg-foreground text-background"
                  : "border-border hover:bg-hover"
              )}
            >
              {preset}%
            </button>
          ))}
        </div>
      </Section>

      {element.locked && (
        <p className="text-muted-foreground px-4 py-3 text-xs">
          This widget is locked, unlock it in Layers to drag it.
        </p>
      )}
    </>
  );
}

function ConnectionProperties() {
  const settings = useOverlayEditorStore(state => state.settings);
  const setSettings = useOverlayEditorStore(state => state.setSettings);

  return (
    <>
      <div className="border-border border-b px-4 py-3">
        <h2 className="font-semibold">Overlay settings</h2>
        <p className="text-muted-foreground mt-0.5 text-xs">Select a widget on the canvas to edit it.</p>
      </div>
      <Section title="Player" hint="Whose profile the player widgets show.">
        <Input
          value={settings.playerId}
          maxLength={32}
          placeholder="ScoreSaber player id"
          onChange={event => setSettings({ ...settings, playerId: event.target.value.trim() })}
        />
      </Section>
      <Section title="Game connection">
        <label className="flex items-center justify-between text-sm">
          Use live game data
          <Switch
            checked={settings.useRealTimeData}
            onCheckedChange={useRealTimeData => setSettings({ ...settings, useRealTimeData })}
          />
        </label>
        <Select
          value={settings.dataClient}
          onValueChange={dataClient =>
            setSettings({
              ...settings,
              dataClient: dataClient === "BeatSaberPlus" ? "BeatSaberPlus" : "HTTPSiraStatus",
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="HTTPSiraStatus">HTTPSiraStatus</SelectItem>
            <SelectItem value="BeatSaberPlus">Beat Saber Plus</SelectItem>
          </SelectContent>
        </Select>
      </Section>
      <Section title="Shortcuts">
        <dl className="text-muted-foreground grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          <dt className="text-foreground">Arrows</dt>
          <dd>Nudge (Shift for 10px)</dd>
          <dt className="text-foreground">Alt + drag</dt>
          <dd>Move without snapping</dd>
          <dt className="text-foreground">Shift + scale</dt>
          <dd>Snap to 10% steps</dd>
          <dt className="text-foreground">Ctrl+Z / Ctrl+D</dt>
          <dd>Undo / duplicate</dd>
          <dt className="text-foreground">Drag on empty space</dt>
          <dd>Select several (Shift adds)</dd>
          <dt className="text-foreground">Ctrl+A</dt>
          <dd>Select everything</dd>
          <dt className="text-foreground">Delete</dt>
          <dd>Remove the widget</dd>
        </dl>
      </Section>
    </>
  );
}

function MultiProperties({ ids }: { ids: string[] }) {
  const elements = useOverlayEditorStore(state =>
    state.layout.elements.filter(element => ids.includes(element.id))
  );
  const updateElements = useOverlayEditorStore(state => state.updateElements);
  const duplicateElements = useOverlayEditorStore(state => state.duplicateElements);
  const removeElements = useOverlayEditorStore(state => state.removeElements);
  const allVisible = elements.every(element => element.visible);
  const allLocked = elements.every(element => element.locked);

  return (
    <>
      <div className="border-border border-b px-4 py-3">
        <h2 className="font-semibold">{ids.length} widgets selected</h2>
        <p className="text-muted-foreground mt-0.5 text-xs">Drag to move them together.</p>
      </div>
      <Section title="Actions">
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" onClick={() => updateElements(ids, { visible: !allVisible })}>
            {allVisible ? "Hide all" : "Show all"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => updateElements(ids, { locked: !allLocked })}>
            {allLocked ? "Unlock all" : "Lock all"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => duplicateElements(ids)}>
            Duplicate
          </Button>
          <Button size="sm" variant="destructive" onClick={() => removeElements(ids)}>
            Delete
          </Button>
        </div>
      </Section>
    </>
  );
}

export default function PropertiesPanel() {
  const selectedIds = useOverlayEditorStore(state => state.selectedIds);
  const element = useOverlayEditorStore(state =>
    state.layout.elements.find(candidate => candidate.id === state.selectedId)
  );

  return (
    <div className="h-full overflow-y-auto">
      {selectedIds.length > 1 ? (
        <MultiProperties ids={selectedIds} />
      ) : element ? (
        <ElementProperties key={element.id} element={element} />
      ) : (
        <ConnectionProperties />
      )}
    </div>
  );
}
