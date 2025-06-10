"use client";

import { type SIDE_OPTIONS } from "@radix-ui/react-popper";
import { clsx } from "clsx";
import React from "react";
import { Tooltip as ShadCnTooltip } from "./ui/tooltip";

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
   * The additional class names
   */
  className?: string;

  /**
   * Where the tooltip will be displayed
   */
  side?: (typeof SIDE_OPTIONS)[number];
};

export default function SimpleTooltip({ children, display, side, className }: Props) {
  return (
    <ShadCnTooltip content={display} side={side}>
      <div className={clsx("cursor-default w-full", className)}>{children}</div>
    </ShadCnTooltip>
  );
}
