import type { OverlayAnchor } from "@ssr/common/schemas/overlay/overlay-anchor";
import { MAX_OVERLAY_SCALE, MIN_OVERLAY_SCALE } from "@ssr/common/schemas/overlay/overlay-element";
import { OVERLAY_CANVAS_HEIGHT, OVERLAY_CANVAS_WIDTH } from "@ssr/common/schemas/overlay/overlay-layout";

export type Point = { x: number; y: number };
export type Size = { w: number; h: number };
/** A box in design pixels, from the top left of the canvas. */
export type Bounds = { left: number; top: number; width: number; height: number };

/** The placement of an element on the canvas. */
export type Placement = { anchor: OverlayAnchor; offset: Point };

/** Where an anchor sits on a box, as a fraction (0 start, 0.5 centre, 1 end) of each axis. */
export function getAnchorFraction(anchor: OverlayAnchor): Point {
  const x = anchor.includes("left") ? 0 : anchor.includes("right") ? 1 : 0.5;
  const y = anchor.includes("top") ? 0 : anchor.includes("bottom") ? 1 : 0.5;
  return { x, y };
}

function axisStart(fraction: number, offset: number, size: number, canvas: number): number {
  if (fraction === 0) {
    return offset;
  }
  if (fraction === 1) {
    return canvas - offset - size;
  }
  return canvas / 2 + offset - size / 2;
}

function axisOffset(fraction: number, start: number, size: number, canvas: number): number {
  if (fraction === 0) {
    return start;
  }
  if (fraction === 1) {
    return canvas - start - size;
  }
  return start + size / 2 - canvas / 2;
}

/**
 * Gets the box an element covers on the canvas.
 *
 * @param placement the anchor and the offset inward from it
 * @param size the size of the element after scaling
 */
export function getBounds(placement: Placement, size: Size): Bounds {
  const fraction = getAnchorFraction(placement.anchor);
  return {
    left: axisStart(fraction.x, placement.offset.x, size.w, OVERLAY_CANVAS_WIDTH),
    top: axisStart(fraction.y, placement.offset.y, size.h, OVERLAY_CANVAS_HEIGHT),
    width: size.w,
    height: size.h,
  };
}

/**
 * Gets the offset an element needs to cover the given bounds when placed on an anchor.
 */
export function getOffsetForBounds(anchor: OverlayAnchor, bounds: Bounds): Point {
  const fraction = getAnchorFraction(anchor);
  return {
    x: axisOffset(fraction.x, bounds.left, bounds.width, OVERLAY_CANVAS_WIDTH),
    y: axisOffset(fraction.y, bounds.top, bounds.height, OVERLAY_CANVAS_HEIGHT),
  };
}

/**
 * Moves an element to a new anchor without it moving on the canvas.
 */
export function changeAnchor(placement: Placement, size: Size, anchor: OverlayAnchor): Placement {
  return { anchor, offset: getOffsetForBounds(anchor, getBounds(placement, size)) };
}

/**
 * Picks the anchor of the third of the canvas the centre of the bounds is in.
 */
export function getAutoAnchor(bounds: Bounds): OverlayAnchor {
  const centreX = bounds.left + bounds.width / 2;
  const centreY = bounds.top + bounds.height / 2;
  const column =
    centreX < OVERLAY_CANVAS_WIDTH / 3 ? "left" : centreX > (OVERLAY_CANVAS_WIDTH / 3) * 2 ? "right" : "";
  const row =
    centreY < OVERLAY_CANVAS_HEIGHT / 3 ? "top" : centreY > (OVERLAY_CANVAS_HEIGHT / 3) * 2 ? "bottom" : "";

  if (row && column) {
    return `${row}-${column}` as OverlayAnchor;
  }
  return (row || column || "center") as OverlayAnchor;
}

/**
 * Applies a pointer movement (in design pixels, right and down positive) to an offset. Offsets are
 * measured inward from the anchor, so right and bottom anchored elements move the other way.
 */
export function applyDelta(placement: Placement, delta: Point): Point {
  const fraction = getAnchorFraction(placement.anchor);
  return {
    x: placement.offset.x + (fraction.x === 1 ? -delta.x : delta.x),
    y: placement.offset.y + (fraction.y === 1 ? -delta.y : delta.y),
  };
}

export function clampScale(scale: number): number {
  return Math.min(MAX_OVERLAY_SCALE, Math.max(MIN_OVERLAY_SCALE, scale));
}

/**
 * Computes the scale after dragging a corner handle. The scale origin is the anchor point, so the
 * ratio of the distances to it is the ratio of the scales.
 *
 * @param startScale the scale when the gesture started
 * @param anchorPoint the anchor point of the element on screen
 * @param startPointer where the pointer was when the gesture started
 * @param pointer where the pointer is now
 * @param step when set, the scale snaps to multiples of it
 */
export function getScaleFromPointer(
  startScale: number,
  anchorPoint: Point,
  startPointer: Point,
  pointer: Point,
  step?: number
): number {
  const startDistance = Math.hypot(startPointer.x - anchorPoint.x, startPointer.y - anchorPoint.y);
  if (startDistance < 1) {
    return startScale;
  }
  const distance = Math.hypot(pointer.x - anchorPoint.x, pointer.y - anchorPoint.y);
  const scale = startScale * (distance / startDistance);
  return clampScale(step ? Math.round(scale / step) * step : scale);
}

export type SnapGuide = { axis: "x" | "y"; position: number };

export const DEFAULT_SNAP_THRESHOLD = 8;
/** Distances from the canvas edge elements snap to. */
export const EDGE_MARGINS = [0, 24, 48];

/**
 * Snaps bounds to the canvas edges (and their margins), the canvas centre lines and the edges of other elements.
 *
 * @returns the bounds moved onto the closest guides (per axis) and the guides that were hit
 */
export function snapBounds(
  bounds: Bounds,
  others: Bounds[],
  threshold: number = DEFAULT_SNAP_THRESHOLD
): { bounds: Bounds; guides: SnapGuide[] } {
  const verticalLines = [
    ...EDGE_MARGINS.flatMap(margin => [margin, OVERLAY_CANVAS_WIDTH - margin]),
    OVERLAY_CANVAS_WIDTH / 2,
    ...others.flatMap(other => [other.left, other.left + other.width, other.left + other.width / 2]),
  ];
  const horizontalLines = [
    ...EDGE_MARGINS.flatMap(margin => [margin, OVERLAY_CANVAS_HEIGHT - margin]),
    OVERLAY_CANVAS_HEIGHT / 2,
    ...others.flatMap(other => [other.top, other.top + other.height, other.top + other.height / 2]),
  ];

  const snapAxis = (start: number, size: number, lines: number[]) => {
    let best: { shift: number; line: number } | undefined;
    for (const edge of [start, start + size / 2, start + size]) {
      for (const line of lines) {
        const shift = line - edge;
        if (Math.abs(shift) <= threshold && (!best || Math.abs(shift) < Math.abs(best.shift))) {
          best = { shift, line };
        }
      }
    }
    return best;
  };

  const snapX = snapAxis(bounds.left, bounds.width, verticalLines);
  const snapY = snapAxis(bounds.top, bounds.height, horizontalLines);
  const guides: SnapGuide[] = [];
  if (snapX) {
    guides.push({ axis: "x", position: snapX.line });
  }
  if (snapY) {
    guides.push({ axis: "y", position: snapY.line });
  }
  return {
    bounds: { ...bounds, left: bounds.left + (snapX?.shift ?? 0), top: bounds.top + (snapY?.shift ?? 0) },
    guides,
  };
}

/** The CSS positioning of an element, in design pixels. */
export type CssPlacement = {
  style: {
    left?: number | string;
    right?: number;
    top?: number | string;
    bottom?: number;
    transform: string;
    transformOrigin: string;
  };
};

/**
 * Gets the CSS to place an element on the canvas: its anchor point sits on the matching canvas
 * anchor point plus the offset, and it scales around that point.
 */
export function getCssPlacement(placement: Placement, scale: number): CssPlacement {
  const fraction = getAnchorFraction(placement.anchor);
  const style: CssPlacement["style"] = {
    transform: "",
    transformOrigin: `${fraction.x * 100}% ${fraction.y * 100}%`,
  };

  const translate: string[] = [];
  if (fraction.x === 0) {
    style.left = placement.offset.x;
  } else if (fraction.x === 1) {
    style.right = placement.offset.x;
  } else {
    style.left = `calc(50% + ${placement.offset.x}px)`;
    translate.push("translateX(-50%)");
  }
  if (fraction.y === 0) {
    style.top = placement.offset.y;
  } else if (fraction.y === 1) {
    style.bottom = placement.offset.y;
  } else {
    style.top = `calc(50% + ${placement.offset.y}px)`;
    translate.push("translateY(-50%)");
  }
  style.transform = [...translate, `scale(${scale})`].join(" ");
  return { style };
}
