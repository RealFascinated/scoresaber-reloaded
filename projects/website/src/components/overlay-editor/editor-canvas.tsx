"use client";

import { measureElementBounds } from "@/common/overlay/editor/measure";
import { useOverlayEditorStore } from "@/common/overlay/editor/overlay-editor-store";
import {
  getAnchorFraction,
  getOffsetForBounds,
  getScaleFromPointer,
  snapBounds,
  type Bounds,
  type Point,
  type SnapGuide,
} from "@/common/overlay/layout-math";
import OverlayElementView from "@/components/overlay/overlay-element-view";
import OverlayStage, { useStageScale } from "@/components/overlay/overlay-stage";
import type { OverlayElement } from "@ssr/common/schemas/overlay/overlay-element";
import { PointerEvent, useLayoutEffect, useRef, useState } from "react";
import Moveable from "react-moveable";

/** The stage's position on screen, and screen pixels per design pixel. */
type StageInfo = { left: number; top: number; k: number };

function getStageInfo(): StageInfo | undefined {
  const stage = document.querySelector<HTMLElement>("[data-overlay-stage]");
  if (!stage) {
    return undefined;
  }
  const rect = stage.getBoundingClientRect();
  return { left: rect.left, top: rect.top, k: rect.width / stage.offsetWidth };
}

type GestureMember = { element: OverlayElement; bounds: Bounds };

type GestureStart = {
  members: GestureMember[];
  /** The box around all members. */
  union: Bounds;
  /** The visible elements that are not part of the gesture, which members snap to. */
  others: Bounds[];
  pointer: Point;
  stage: StageInfo;
};

function getUnion(boxes: Bounds[]): Bounds {
  const left = Math.min(...boxes.map(box => box.left));
  const top = Math.min(...boxes.map(box => box.top));
  const right = Math.max(...boxes.map(box => box.left + box.width));
  const bottom = Math.max(...boxes.map(box => box.top + box.height));
  return { left, top, width: right - left, height: bottom - top };
}

/** Starts an undo step and measures everything a drag or scale needs. Locked elements are left out. */
function startGesture(elementIds: string[], pointer: Point): GestureStart | undefined {
  const { layout } = useOverlayEditorStore.getState();
  const stage = getStageInfo();
  const members: GestureMember[] = [];
  for (const element of layout.elements) {
    const bounds =
      elementIds.includes(element.id) && !element.locked ? measureElementBounds(element.id) : undefined;
    if (bounds) {
      members.push({ element, bounds });
    }
  }
  if (!stage || members.length === 0) {
    return undefined;
  }
  const others = layout.elements
    .filter(element => element.visible && !elementIds.includes(element.id))
    .map(element => measureElementBounds(element.id))
    .filter((bounds): bounds is Bounds => !!bounds);

  useOverlayEditorStore.getState().beginGesture();
  return { members, union: getUnion(members.map(member => member.bounds)), others, pointer, stage };
}

function SelectionLayer({
  guides,
  onGuides,
}: {
  guides: SnapGuide[];
  onGuides: (guides: SnapGuide[]) => void;
}) {
  const selectedIds = useOverlayEditorStore(state => state.selectedIds);
  const elements = useOverlayEditorStore(state => state.layout.elements);
  const k = useStageScale();
  const moveableRef = useRef<Moveable>(null);
  const gesture = useRef<GestureStart | undefined>(undefined);

  const selected = elements.filter(element => selectedIds.includes(element.id) && element.visible);
  const single = selected.length === 1 ? selected[0] : undefined;
  // Moveable looks the elements up itself, once they are in the DOM
  const targets = selected.map(element => `[data-element-id="${element.id}"]`);
  const movable = selected.some(element => !element.locked);

  // Keep the handles on the elements when their data changes (panel edits, undo, resize of the window)
  useLayoutEffect(() => {
    moveableRef.current?.updateRect();
  }, [elements, k, selectedIds]);

  const drag = (pointer: Point, altKey: boolean) => {
    const start = gesture.current;
    if (!start) {
      return;
    }
    const delta = {
      x: (pointer.x - start.pointer.x) / start.stage.k,
      y: (pointer.y - start.pointer.y) / start.stage.k,
    };
    const moved: Bounds = {
      ...start.union,
      left: start.union.left + delta.x,
      top: start.union.top + delta.y,
    };
    // Holding alt turns snapping off
    const snapped = altKey ? { bounds: moved, guides: [] } : snapBounds(moved, start.others);
    onGuides(snapped.guides);

    const shift = { x: snapped.bounds.left - start.union.left, y: snapped.bounds.top - start.union.top };
    const patches: Record<string, Partial<OverlayElement>> = {};
    for (const { element, bounds } of start.members) {
      const offset = getOffsetForBounds(element.anchor, {
        ...bounds,
        left: bounds.left + shift.x,
        top: bounds.top + shift.y,
      });
      patches[element.id] = { offset: { x: Math.round(offset.x), y: Math.round(offset.y) } };
    }
    useOverlayEditorStore.getState().updateElementsInGesture(patches);
  };

  const endDrag = () => {
    gesture.current = undefined;
    onGuides([]);
  };

  if (selected.length === 0) {
    return null;
  }

  return (
    <>
      {guides.map(guide => (
        <div
          key={`${guide.axis}-${guide.position}`}
          className="pointer-events-none absolute bg-pink-500"
          style={
            guide.axis === "x"
              ? { left: guide.position, top: 0, width: 1 / k, height: "100%" }
              : { top: guide.position, left: 0, height: 1 / k, width: "100%" }
          }
        />
      ))}
      <Moveable
        ref={moveableRef}
        target={targets.length === 1 ? targets[0] : targets}
        origin={false}
        draggable={movable}
        scalable={!!single && !single.locked}
        keepRatio
        renderDirections={single && !single.locked ? ["nw", "ne", "sw", "se"] : []}
        throttleDrag={0}
        throttleScale={0}
        onDragStart={event => {
          gesture.current = startGesture(selectedIds, { x: event.clientX, y: event.clientY });
        }}
        onDrag={event => drag({ x: event.clientX, y: event.clientY }, !!event.inputEvent?.altKey)}
        onDragEnd={endDrag}
        onDragGroupStart={event => {
          gesture.current = startGesture(selectedIds, { x: event.clientX, y: event.clientY });
        }}
        onDragGroup={event => drag({ x: event.clientX, y: event.clientY }, !!event.inputEvent?.altKey)}
        onDragGroupEnd={endDrag}
        onScaleStart={event => {
          gesture.current = startGesture(selectedIds, { x: event.clientX, y: event.clientY });
        }}
        onScale={event => {
          const start = gesture.current;
          const member = start?.members[0];
          if (!start || !member) {
            return;
          }
          const fraction = getAnchorFraction(member.element.anchor);
          const anchorPoint = {
            x: start.stage.left + (member.bounds.left + member.bounds.width * fraction.x) * start.stage.k,
            y: start.stage.top + (member.bounds.top + member.bounds.height * fraction.y) * start.stage.k,
          };
          const scale = getScaleFromPointer(
            member.element.scale,
            anchorPoint,
            start.pointer,
            { x: event.clientX, y: event.clientY },
            event.inputEvent?.shiftKey ? 0.1 : undefined
          );
          useOverlayEditorStore
            .getState()
            .updateElementInGesture(member.element.id, { scale: Math.round(scale * 1000) / 1000 });
        }}
        onScaleEnd={() => {
          gesture.current = undefined;
        }}
      />
    </>
  );
}

/** A dotted outline around the 16:9 canvas, so it is clear where the overlay ends. */
function CanvasBounds() {
  const k = useStageScale();
  return (
    <div
      className="border-foreground/50 pointer-events-none absolute inset-0 border-dotted"
      // Keeps the line 2 screen pixels thick whatever the stage is scaled to
      style={{ borderWidth: 2 / k }}
      aria-hidden
    />
  );
}

type Marquee = { startX: number; startY: number; x: number; y: number };

/** Finds the visible elements that touch a rectangle given in screen coordinates. */
function getElementsInRect(marquee: Marquee): string[] {
  const stage = getStageInfo();
  if (!stage) {
    return [];
  }
  const left = (Math.min(marquee.startX, marquee.x) - stage.left) / stage.k;
  const right = (Math.max(marquee.startX, marquee.x) - stage.left) / stage.k;
  const top = (Math.min(marquee.startY, marquee.y) - stage.top) / stage.k;
  const bottom = (Math.max(marquee.startY, marquee.y) - stage.top) / stage.k;

  return useOverlayEditorStore
    .getState()
    .layout.elements.filter(element => {
      const bounds = element.visible ? measureElementBounds(element.id) : undefined;
      return (
        !!bounds &&
        bounds.left < right &&
        bounds.left + bounds.width > left &&
        bounds.top < bottom &&
        bounds.top + bounds.height > top
      );
    })
    .map(element => element.id);
}

/** Moving less than this (screen px) is a click, not a selection rectangle. */
const MARQUEE_THRESHOLD = 4;

/**
 * The canvas of the editor: the overlay with a selection box, drag and scale handles, snapping guides, and
 * a selection rectangle to select several elements at once.
 */
export default function EditorCanvas() {
  const layout = useOverlayEditorStore(state => state.layout);
  const [guides, setGuides] = useState<SnapGuide[]>([]);
  const [marquee, setMarquee] = useState<Marquee>();
  /** What was selected when the rectangle started, kept when shift is held. */
  const baseSelection = useRef<string[]>([]);

  const onElementPointerDown = (id: string) => (event: PointerEvent<HTMLDivElement>) => {
    const store = useOverlayEditorStore.getState();
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      store.toggleSelection(id);
    } else if (!store.selectedIds.includes(id)) {
      // An element that is already part of a selection stays in it, so the whole group can be dragged
      store.select(id);
    }
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const onBackground = target === event.currentTarget || target.hasAttribute("data-overlay-stage");
    if (event.button !== 0 || !onBackground) {
      return;
    }
    const store = useOverlayEditorStore.getState();
    baseSelection.current = event.shiftKey ? store.selectedIds : [];
    if (!event.shiftKey) {
      store.select(undefined);
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    setMarquee({ startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY });
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!marquee) {
      return;
    }
    const next = { ...marquee, x: event.clientX, y: event.clientY };
    setMarquee(next);
    if (Math.hypot(next.x - next.startX, next.y - next.startY) >= MARQUEE_THRESHOLD) {
      const hits = getElementsInRect(next);
      useOverlayEditorStore.getState().setSelection([...new Set([...baseSelection.current, ...hits])]);
    }
  };

  const endMarquee = (event: PointerEvent<HTMLDivElement>) => {
    if (marquee) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      setMarquee(undefined);
    }
  };

  const showMarquee =
    marquee && Math.hypot(marquee.x - marquee.startX, marquee.y - marquee.startY) >= MARQUEE_THRESHOLD;

  return (
    <div
      className="bg-muted/30 relative h-full w-full p-8"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endMarquee}
      onPointerCancel={endMarquee}
    >
      {layout.elements.length === 0 && (
        <div className="text-muted-foreground pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-sm">
          Add a widget from the panel on the left to get started.
        </div>
      )}
      <OverlayStage
        layout={layout}
        canvasClassName="bg-black/40"
        renderElement={element => (
          <OverlayElementView
            key={element.id}
            element={element}
            className={element.locked ? "cursor-default" : "cursor-move"}
            onPointerDown={onElementPointerDown(element.id)}
          />
        )}
      >
        <CanvasBounds />
        <SelectionLayer guides={guides} onGuides={setGuides} />
      </OverlayStage>
      {showMarquee && (
        <div
          className="border-primary bg-primary/10 pointer-events-none fixed z-50 border"
          style={{
            left: Math.min(marquee.startX, marquee.x),
            top: Math.min(marquee.startY, marquee.y),
            width: Math.abs(marquee.x - marquee.startX),
            height: Math.abs(marquee.y - marquee.startY),
          }}
        />
      )}
    </div>
  );
}
