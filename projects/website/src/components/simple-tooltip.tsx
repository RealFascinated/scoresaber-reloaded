import { type SIDE_OPTIONS } from "@radix-ui/react-popper";
import { clsx } from "clsx";
import React from "react";
import { Tooltip } from "./ui/tooltip";

export default function SimpleTooltip({
  children,
  display,
  side,
  className,
  showOnMobile,
  closeDelayDuration,
}: {
  children: React.ReactNode;
  display: React.ReactNode | string;
  side?: (typeof SIDE_OPTIONS)[number];
  className?: string;
  showOnMobile?: boolean;
  closeDelayDuration?: number;
}) {
  return (
    <Tooltip
      content={
        typeof display === "string" ? <p className="max-w-[400px] text-wrap">{display}</p> : display
      }
      side={side}
      showOnMobile={showOnMobile}
      closeDelayDuration={closeDelayDuration}
    >
      <div className={clsx("flex w-full cursor-default items-center justify-center", className)}>
        {children}
      </div>
    </Tooltip>
  );
}
