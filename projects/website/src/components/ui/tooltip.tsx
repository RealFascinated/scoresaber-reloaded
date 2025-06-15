"use client";

import { cn } from "@/common/utils";
import { useIsMobile } from "@/hooks/use-is-mobile";
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
    if (!portalContainer) {
      portalContainer = createPortalContainer();
    }
    return () => {
      if (portalContainer && portalContainer.parentNode) {
        portalContainer.parentNode.removeChild(portalContainer);
        portalContainer = null;
      }
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

    let top = 0;
    let left = 0;

    switch (side) {
      case "top":
        top = triggerRect.top - tooltipRect.height - 4;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case "bottom":
        top = triggerRect.bottom + 4;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case "left":
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left - tooltipRect.width - 4;
        break;
      case "right":
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + 4;
        break;
    }

    // Ensure tooltip stays within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left < 0) left = 0;
    if (top < 0) top = 0;
    if (left + tooltipRect.width > viewportWidth) {
      left = viewportWidth - tooltipRect.width;
    }
    if (top + tooltipRect.height > viewportHeight) {
      top = viewportHeight - tooltipRect.height;
    }

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
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
        portalContainer &&
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
            }}
            className={cn(
              "z-50 overflow-hidden rounded-md bg-accent px-2.5 py-1 text-[13px] text-secondary-foreground shadow-md",
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
          portalContainer
        )}
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
