import { ReactNode } from "react";
import { cn } from "@/common/utils";

export enum OverlayViewPosition {
  TOP_LEFT = 1,
  TOP_RIGHT = 2,
  BOTTOM_LEFT = 3,
  BOTTOM_RIGHT = 4,
  CENTER = 5,
}

type OverlayViewProps = {
  /**
   * The position of the view in the grid.
   */
  position: OverlayViewPosition;

  /**
   * The class name of the view.
   */
  className?: string;

  /**
   * The children of the view.
   */
  children: ReactNode;
};

/**
 * Gets the classes for the position of the view.
 *
 * @param pos the position of the view
 * @returns the classes for the position of the view
 */
const getPositionClasses = (pos: OverlayViewPosition): string => {
  switch (pos) {
    case OverlayViewPosition.TOP_LEFT:
      return "top-0 left-0";
    case OverlayViewPosition.TOP_RIGHT:
      return "top-0 right-0";
    case OverlayViewPosition.BOTTOM_LEFT:
      return "bottom-0 left-0";
    case OverlayViewPosition.BOTTOM_RIGHT:
      return "bottom-0 right-0";
    case OverlayViewPosition.CENTER:
      return "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2";
    default:
      return "";
  }
};

export default function OverlayView({ position, className, children }: OverlayViewProps) {
  return <div className={cn("fixed p-2", getPositionClasses(position), className)}>{children}</div>;
}
