"use client";

import { Tooltip as ShadCnTooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { clsx } from "clsx";

type Props = {
  /**
   * What will trigger the tooltip
   */
  children: React.ReactNode;

  /**
   * What will be displayed in the tooltip
   */
  display: React.ReactNode;

  /**
   * Display the trigger as a child element.
   */
  asChild?: boolean;

  /**
   * The additional class names
   */
  className?: string;

  /**
   * Where the tooltip will be displayed
   */
  side?: "top" | "bottom" | "left" | "right";
};

export default function Tooltip({ children, display, asChild = true, side = "top", className }: Props) {
  return (
    <ShadCnTooltip>
      <TooltipTrigger className={clsx("cursor-default", className)} asChild={asChild}>
        {children}
      </TooltipTrigger>
      <TooltipContent className="max-w-[350px]" side={side}>
        {display}
      </TooltipContent>
    </ShadCnTooltip>
  );
}
