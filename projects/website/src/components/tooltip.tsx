"use client";

import { Tooltip as ShadCnTooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { useState } from "react";
import { cn } from "@/common/utils";
import { useDebounce } from "@uidotdev/usehooks";

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
  const [open, setOpen] = useState(false);

  return (
    <ShadCnTooltip open={open}>
      <TooltipTrigger className={className} asChild={asChild}>
        <div
          className={cn("cursor-default", className)}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onTouchStart={() => setOpen(!open)}
          onTouchEnd={() => setOpen(!open)}
        >
          {children}
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-[350px]" side={side}>
        {display}
      </TooltipContent>
    </ShadCnTooltip>
  );
}
