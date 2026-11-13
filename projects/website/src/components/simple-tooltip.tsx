"use client";

import { cn } from "@/common/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/contexts/viewport-context";
import { type SIDE_OPTIONS } from "@radix-ui/react-popper";
import { isValidElement, ReactNode, useRef, useState } from "react";

/**
 * True when the tooltip wraps a single already-interactive element (button, link, input...).
 * In that case the element itself is the keyboard focus target, so the wrapper must not
 * add a second tab stop.
 */
type InteractiveChildProps = {
  onClick?: (...args: never[]) => void;
  href?: string;
};

function isInteractiveChild(child: React.ReactNode): boolean {
  if (!isValidElement<InteractiveChildProps>(child)) {
    return false;
  }
  if (typeof child.type === "string") {
    return ["button", "a", "input", "select", "textarea", "summary", "label"].includes(child.type);
  }
  const props = child.props;
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
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Tooltips don't trigger reliably on touch screens; only render them there when explicitly requested.
  if (isMobile && !showOnMobile) {
    return <div className={className}>{children}</div>;
  }

  const interactive = isInteractiveChild(children);

  // On touch devices Radix opens on focus/hover emulation and then closes again on the
  // click, so the tooltip flashes. Control it manually there: tap toggles, tap outside closes.
  const touchProps = isMobile
    ? {
        open,
        onOpenChange: () => {},
      }
    : {};

  return (
    <Tooltip {...touchProps}>
      <TooltipTrigger asChild>
        <div
          ref={triggerRef}
          onClick={isMobile ? () => setOpen(previous => !previous) : undefined}
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
      <TooltipContent
        side={side}
        className="max-w-xs"
        onPointerDownOutside={event => {
          if (!isMobile) {
            return;
          }
          if (event.target instanceof Node && triggerRef.current?.contains(event.target)) {
            return;
          }
          setOpen(false);
        }}
      >
        {typeof display === "string" ? <p>{display}</p> : display}
      </TooltipContent>
    </Tooltip>
  );
}
