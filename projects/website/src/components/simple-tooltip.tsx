"use client";

import { type SIDE_OPTIONS } from "@radix-ui/react-popper";
import { clsx } from "clsx";
import { Tooltip as ShadCnTooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

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
  side?: (typeof SIDE_OPTIONS)[number];
};

export default function SimpleTooltip({
  children,
  display,
  asChild = true,
  side,
  className,
}: Props) {
  return (
    <ShadCnTooltip>
      <TooltipTrigger className={clsx("cursor-default w-full", className)} asChild={asChild}>
        <div>{children}</div>
      </TooltipTrigger>
      <TooltipContent
        className="max-w-[500px] bg-muted text-white border border-muted/50"
        side={side}
      >
        {display}
      </TooltipContent>
    </ShadCnTooltip>
  );
}
