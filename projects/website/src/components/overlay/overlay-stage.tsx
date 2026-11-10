"use client";

import { cn } from "@/common/utils";
import OverlayElementView from "@/components/overlay/overlay-element-view";
import {
  OVERLAY_CANVAS_HEIGHT,
  OVERLAY_CANVAS_WIDTH,
  type OverlayLayout,
} from "@ssr/common/schemas/overlay/overlay-layout";
import { createContext, ReactNode, useContext, useLayoutEffect, useRef, useState } from "react";

const StageScaleContext = createContext(1);

/** The scale of the stage: screen pixels per design pixel. */
export function useStageScale(): number {
  return useContext(StageScaleContext);
}

type OverlayStageProps = {
  layout: OverlayLayout;
  className?: string;
  /** Classes for the 1920x1080 canvas itself, e.g. a background in the editor. */
  canvasClassName?: string;
  /** Renders an element, defaults to a plain {@link OverlayElementView}. */
  renderElement?: (element: OverlayLayout["elements"][number]) => ReactNode;
  /** Rendered on top of the elements, inside the stage (selection, guides). */
  children?: ReactNode;
};

/**
 * Renders an overlay on a fixed 1920x1080 canvas that is scaled to fit its container, so every
 * layout looks the same at any resolution. The editor and the OBS page both render this.
 */
export default function OverlayStage({
  layout,
  className,
  canvasClassName,
  renderElement,
  children,
}: OverlayStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const update = () => {
      const { clientWidth, clientHeight } = container;
      const fit = Math.min(clientWidth / OVERLAY_CANVAS_WIDTH, clientHeight / OVERLAY_CANVAS_HEIGHT);
      setScale(fit);
      // Centre the canvas, any space left over is transparent
      setOffset({
        x: (clientWidth - OVERLAY_CANVAS_WIDTH * fit) / 2,
        y: (clientHeight - OVERLAY_CANVAS_HEIGHT * fit) / 2,
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const elements = [...layout.elements].sort((a, b) => a.z - b.z);

  return (
    <div ref={containerRef} className={cn("relative h-full w-full overflow-hidden", className)}>
      <div
        data-overlay-stage
        className={cn("absolute top-0 left-0 origin-top-left", canvasClassName)}
        style={{
          width: OVERLAY_CANVAS_WIDTH,
          height: OVERLAY_CANVAS_HEIGHT,
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
        }}
      >
        <StageScaleContext value={scale}>
          {elements.map(element =>
            renderElement ? renderElement(element) : <OverlayElementView key={element.id} element={element} />
          )}
          {children}
        </StageScaleContext>
      </div>
    </div>
  );
}
