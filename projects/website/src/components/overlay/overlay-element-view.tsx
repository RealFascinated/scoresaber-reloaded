"use client";

import { getCssPlacement } from "@/common/overlay/layout-math";
import { useOverlayRuntime } from "@/common/overlay/overlay-runtime";
import { cn } from "@/common/utils";
import { OVERLAY_WIDGETS, OverlayWidget } from "@/components/overlay/widget-registry";
import type { OverlayElement } from "@ssr/common/schemas/overlay/overlay-element";
import { PointerEvent, Ref } from "react";

type OverlayElementViewProps = {
  element: OverlayElement;
  ref?: Ref<HTMLDivElement>;
  className?: string;
  onPointerDown?: (event: PointerEvent<HTMLDivElement>) => void;
};

/**
 * One element of an overlay, placed on the canvas by its anchor and offset.
 */
export default function OverlayElementView({
  element,
  ref,
  className,
  onPointerDown,
}: OverlayElementViewProps) {
  const runtime = useOverlayRuntime();
  const definition = OVERLAY_WIDGETS[element.type];
  const available = definition.isAvailable(runtime);

  if (!element.visible || (!available && !runtime.editing)) {
    return null;
  }

  const { style } = getCssPlacement({ anchor: element.anchor, offset: element.offset }, element.scale);
  const { w, h } = element.size;

  return (
    <div
      ref={ref}
      data-element-id={element.id}
      onPointerDown={onPointerDown}
      className={cn("absolute", className)}
      style={{
        ...style,
        width: w === "auto" ? undefined : w,
        height: h === "auto" ? undefined : h,
        zIndex: element.z,
      }}
    >
      {available ? (
        <OverlayWidget element={element} />
      ) : (
        <div className="border-muted-foreground/60 text-muted-foreground flex size-full min-h-10 min-w-40 items-center justify-center rounded-md border border-dashed px-3 py-2 text-lg whitespace-nowrap">
          {definition.label}
          {definition.requiresRealTimeData ? " (live only)" : ""}
        </div>
      )}
    </div>
  );
}
