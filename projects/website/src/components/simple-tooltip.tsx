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
}: {
  children: React.ReactNode;
  display: React.ReactNode | string;
  side?: (typeof SIDE_OPTIONS)[number];
  className?: string;
  showOnMobile?: boolean;
}) {
  return (
    <Tooltip
      content={
        typeof display === "string" ? (
          <p className="max-w-[350px] text-center text-wrap">{display}</p>
        ) : (
          display
        )
      }
      side={side}
      showOnMobile={showOnMobile}
    >
      <div className={clsx("w-full cursor-default", className)}>{children}</div>
    </Tooltip>
  );
}
