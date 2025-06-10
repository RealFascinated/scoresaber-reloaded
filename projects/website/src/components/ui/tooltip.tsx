"use client";

import { cn } from "@/common/utils";
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

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}

export const Tooltip = React.memo(function Tooltip({
  children,
  content,
  side = "top",
  className,
}: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const lastPositionRef = useRef<{ top: number; left: number } | null>(null);

  // Initialize shared portal container
  useEffect(() => {
    if (!portalContainer) {
      portalContainer = createPortalContainer();
    }
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const updatePosition = useCallback(() => {
    if (!isOpen || !triggerRef.current || !tooltipRef.current) return;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
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

      // Only update if position changed
      if (
        !lastPositionRef.current ||
        lastPositionRef.current.top !== top ||
        lastPositionRef.current.left !== left
      ) {
        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
        lastPositionRef.current = { top, left };
      }
    });
  }, [isOpen, side]);

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();
    const handleScroll = () => requestAnimationFrame(updatePosition);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [isOpen, updatePosition]);

  const handleMouseEnter = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleClick = useCallback(() => {
    setIsOpen(true);
  }, []);

  // Update position after mount and when content changes
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(updatePosition);
    }
  }, [isOpen, content, updatePosition]);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
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
            }}
            className={cn(
              "z-50 overflow-hidden rounded-md bg-accent px-2.5 py-1 text-[13px] text-secondary-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
              {
                "data-[side=bottom]:slide-in-from-top-2": side === "bottom",
                "data-[side=left]:slide-in-from-right-2": side === "left",
                "data-[side=right]:slide-in-from-left-2": side === "right",
                "data-[side=top]:slide-in-from-bottom-2": side === "top",
              },
              className
            )}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
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
}: {
  children: React.ReactNode;
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
