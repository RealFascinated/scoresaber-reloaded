"use client";

import { cn } from "@/common/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/contexts/viewport-context";
import { type SIDE_OPTIONS } from "@radix-ui/react-popper";
import { isValidElement, ReactNode } from "react";

/**
 * True when the tooltip wraps a single already-interactive element (button, link, input...).
 * In that case the element itself is the keyboard focus target, so the wrapper must not
 * add a second tab stop.
 */
function isInteractiveChild(child: React.ReactNode): boolean {
  if (!isValidElement(child)) {
    return false;
  }
  if (typeof child.type === "string") {
    return ["button", "a", "input", "select", "textarea", "summary", "label"].includes(child.type);
  }
  const props = child.props as { onClick?: unknown; href?: unknown };
  return typeof props.onClick === "function" || typeof props.href === "string";
}

export default function SimpleTooltip({
  children,
  display,
  side,
  className,
  showOnMobile = false,
}: {
  children: React.ReactNode;
  display: ReactNode | string;
  side?: (typeof SIDE_OPTIONS)[number];
  className?: string;
  showOnMobile?: boolean;
}) {
  const isMobile = useIsMobile();

  // Tooltips don't trigger reliably on touch screens; only render them there when explicitly requested.
  if (isMobile && !showOnMobile) {
    return <div className={className}>{children}</div>;
  }

  const interactive = isInteractiveChild(children);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          tabIndex={interactive ? undefined : 0}
          className={cn(
            !interactive &&
              "focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-hidden",
            className
          )}
        >
          {children}
        </div>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs">
        {typeof display === "string" ? <p>{display}</p> : display}
      </TooltipContent>
    </Tooltip>
  );
}
