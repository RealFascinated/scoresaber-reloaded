"use client";

import { type SIDE_OPTIONS } from "@radix-ui/react-popper";
import { clsx } from "clsx";
import React from "react";
import { Tooltip as ShadCnTooltip } from "./ui/tooltip";

export default function SimpleTooltip({
  children,
  display,
  side,
  className,
  showOnMobile,
}: {
  children: React.ReactNode;
  display: React.ReactNode;
  side?: (typeof SIDE_OPTIONS)[number];
  className?: string;
  showOnMobile?: boolean;
}) {
  return (
    <ShadCnTooltip content={display} side={side} showOnMobile={showOnMobile}>
      <div className={clsx("cursor-default w-full", className)}>{children}</div>
    </ShadCnTooltip>
  );
}
