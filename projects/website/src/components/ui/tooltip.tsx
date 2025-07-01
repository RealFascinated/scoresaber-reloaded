"use client";

import { cn } from "@/common/utils";
import { useIsMobile } from "@/contexts/viewport-context";
import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Shared portal container for all tooltips
const createPortalContainer = () => {
  const div = document.createElement("div");
  div.style.position = "fixed";
  div.style.top = "0";
  div.style.left = "0";
  div.style.width = "100%";
  div.style.height = "100%";
  div.style.pointerEvents = "none";
  div.style.zIndex = "9999";
  document.body.appendChild(div);
  return div;
};

// Singleton portal container
let portalContainer: HTMLDivElement | null = null;

// Ensure portal container exists
const ensurePortalContainer = () => {
  if (!portalContainer || !portalContainer.parentNode) {
    portalContainer = createPortalContainer();
  }
  return portalContainer;
};

export const Tooltip = React.memo(function Tooltip({
  children,
  content,
  side = "top",
  className,
  delayDuration = 0,
  showOnMobile = false,
}: {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
  delayDuration?: number;
  showOnMobile?: boolean;
}) {
  const isMobile = useIsMobile();

  const [isOpen, setIsOpen] = useState(false);
  const [isPositioned, setIsPositioned] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Initialize shared portal container
  useEffect(() => {
    ensurePortalContainer();
    return () => {
      // Don't remove the portal container on unmount
      // It will be reused by other tooltips
    };
  }, []);

  const handleClick = useCallback(() => {
    if (isMobile) {
      setIsPositioned(false);
      setIsOpen(prev => !prev);
    }
  }, [isMobile]);

  // Add click outside handler
  useEffect(() => {
    if (!isMobile || !isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("scroll", handleScroll);
    };
  }, [isMobile, isOpen]);

  const updatePosition = useCallback(() => {
    if (!isOpen || !triggerRef.current || !tooltipRef.current) return;

    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!trigger || !tooltip) return;

    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Try all possible positions in order of preference
    const positions = [
      {
        side: side,
        getPosition: () => {
          switch (side) {
            case "top":
              return {
                top: triggerRect.top - tooltipRect.height - 4,
                left: triggerRect.left + (triggerRect.width - tooltipRect.width) / 2,
              };
            case "bottom":
              return {
                top: triggerRect.bottom + 4,
                left: triggerRect.left + (triggerRect.width - tooltipRect.width) / 2,
              };
            case "left":
              return {
                top: triggerRect.top + (triggerRect.height - tooltipRect.height) / 2,
                left: triggerRect.left - tooltipRect.width - 4,
              };
            case "right":
              return {
                top: triggerRect.top + (triggerRect.height - tooltipRect.height) / 2,
                left: triggerRect.right + 4,
              };
          }
        },
      },
      {
        side: "top",
        getPosition: () => ({
          top: triggerRect.top - tooltipRect.height - 4,
          left: triggerRect.left + (triggerRect.width - tooltipRect.width) / 2,
        }),
      },
      {
        side: "bottom",
        getPosition: () => ({
          top: triggerRect.bottom + 4,
          left: triggerRect.left + (triggerRect.width - tooltipRect.width) / 2,
        }),
      },
      {
        side: "left",
        getPosition: () => ({
          top: triggerRect.top + (triggerRect.height - tooltipRect.height) / 2,
          left: triggerRect.left - tooltipRect.width - 4,
        }),
      },
      {
        side: "right",
        getPosition: () => ({
          top: triggerRect.top + (triggerRect.height - tooltipRect.height) / 2,
          left: triggerRect.right + 4,
        }),
      },
    ];

    // Try each position until we find one that fits
    let bestPosition = null;
    for (const pos of positions) {
      const { top, left } = pos.getPosition();
      if (
        top >= 0 &&
        left >= 0 &&
        top + tooltipRect.height <= viewportHeight &&
        left + tooltipRect.width <= viewportWidth
      ) {
        bestPosition = { ...pos, top, left };
        break;
      }
    }

    // If no position fits, use the original position but allow wrapping
    if (!bestPosition) {
      const { top, left } = positions[0].getPosition();
      bestPosition = {
        side: positions[0].side,
        top: Math.max(0, Math.min(top, viewportHeight - tooltipRect.height)),
        left: Math.max(0, Math.min(left, viewportWidth - tooltipRect.width)),
      };
      tooltip.style.whiteSpace = "normal";
    } else {
      tooltip.style.whiteSpace = "nowrap";
    }

    tooltip.style.top = `${bestPosition.top}px`;
    tooltip.style.left = `${bestPosition.left}px`;
    tooltip.setAttribute("data-side", bestPosition.side);
    setIsPositioned(true);
  }, [isOpen, side]);

  // Update position when tooltip opens or content changes
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the tooltip is mounted
      const timeoutId = setTimeout(updatePosition, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, content, updatePosition]);

  const handleMouseEnter = useCallback(() => {
    if (!isMobile) {
      setIsOpen(true);
    }
  }, [isMobile]);

  const handleMouseLeave = useCallback(() => {
    if (!isMobile) {
      setIsOpen(false);
    }
  }, [isMobile]);

  if (isMobile && !showOnMobile) {
    return <div>{children}</div>;
  }

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={!isMobile ? handleMouseEnter : undefined}
        onMouseLeave={!isMobile ? handleMouseLeave : undefined}
        onClick={isMobile ? handleClick : undefined}
        style={{ cursor: isMobile ? "pointer" : "default" }}
      >
        {children}
      </div>
      {isOpen &&
        (() => {
          const container = ensurePortalContainer();
          return (
            container &&
            createPortal(
              <div
                ref={tooltipRef}
                style={{
                  position: "fixed",
                  pointerEvents: "auto",
                  zIndex: 9999,
                  border: "1px solid hsl(12 6.5% 25.1%)",
                  opacity: isPositioned ? 1 : 0,
                  transition: isMobile ? "none" : `opacity ${delayDuration}ms ease-in-out`,
                  whiteSpace: "nowrap",
                }}
                className={cn(
                  "bg-accent text-secondary-foreground z-50 overflow-hidden rounded-md px-2.5 py-1 text-[13px] shadow-md",
                  !isMobile &&
                    "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
                  !isMobile && {
                    "data-[side=bottom]:slide-in-from-top-2": side === "bottom",
                    "data-[side=left]:slide-in-from-right-2": side === "left",
                    "data-[side=right]:slide-in-from-left-2": side === "right",
                    "data-[side=top]:slide-in-from-bottom-2": side === "top",
                  },
                  className
                )}
                onMouseEnter={!isMobile ? handleMouseEnter : undefined}
                onMouseLeave={!isMobile ? handleMouseLeave : undefined}
              >
                {content}
              </div>,
              container
            )
          );
        })()}
    </>
  );
});

// For backward compatibility
export const TooltipProvider = React.memo(function TooltipProvider({
  children,
  delayDuration = 0,
}: {
  children: React.ReactNode;
  delayDuration?: number;
}) {
  return <>{children}</>;
});

export const TooltipTrigger = React.memo(function TooltipTrigger({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
});

export const TooltipContent = React.memo(function TooltipContent({
  children,
  className,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  [key: string]: any;
}) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
});
