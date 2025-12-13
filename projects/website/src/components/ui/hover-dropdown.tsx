"use client";

import { cn } from "@/common/utils";
import { useIsMobile } from "@/contexts/viewport-context";
import Link from "next/link";
import React, { cloneElement, isValidElement, ReactNode, useEffect, useRef, useState } from "react";

interface HoverDropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  delay?: number;
  openDelay?: number;
}

export function HoverDropdown({
  trigger,
  children,
  className = "",
  contentClassName = "",
  delay = 200,
  openDelay = 250,
}: HoverDropdownProps) {
  const [open, setOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const isMobile = useIsMobile();
  const delayedCloseTimeout = useRef<NodeJS.Timeout | null>(null);
  const delayedOpenTimeout = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const closeDropdown = () => {
    setIsVisible(false);
    setTimeout(() => setOpen(false), 200); // Wait for animation to complete
  };

  const handleMouseEnter = () => {
    if (isMobile) return; // Don't handle hover on mobile

    if (delayedCloseTimeout.current) {
      clearTimeout(delayedCloseTimeout.current);
      delayedCloseTimeout.current = null;
    }
    if (delayedOpenTimeout.current) {
      clearTimeout(delayedOpenTimeout.current);
    }
    delayedOpenTimeout.current = setTimeout(() => {
      setOpen(true);
      setIsVisible(true);
    }, openDelay);
  };

  const handleMouseLeave = () => {
    if (isMobile) return; // Don't handle hover on mobile

    if (delayedCloseTimeout.current) {
      clearTimeout(delayedCloseTimeout.current);
    }
    if (delayedOpenTimeout.current) {
      clearTimeout(delayedOpenTimeout.current);
      delayedOpenTimeout.current = null;
    }
    delayedCloseTimeout.current = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => setOpen(false), 200); // Wait for animation to complete
    }, delay);
  };

  const handleClick = () => {
    if (isMobile) {
      // On mobile, toggle on click
      if (open) {
        setIsVisible(false);
        setTimeout(() => setOpen(false), 200);
      } else {
        setOpen(true);
        setIsVisible(true);
      }
    }
  };

  // Handle click outside on mobile
  useEffect(() => {
    if (!isMobile || !open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsVisible(false);
        setTimeout(() => setOpen(false), 200);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobile, open]);

  // Handle scroll to close dropdown
  useEffect(() => {
    if (!open) return;

    const handleScroll = () => {
      closeDropdown();
    };

    // Listen to scroll events on window and all scrollable containers
    window.addEventListener("scroll", handleScroll, true);
    document.addEventListener("scroll", handleScroll, true);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, [open]);

  return (
    <div
      ref={dropdownRef}
      className={`relative ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {trigger}

      {open && (
        <div
          className={`bg-card border-border text-card-foreground absolute top-full z-50 overflow-hidden rounded-xl border shadow-lg backdrop-blur-sm transition-all duration-200 ${
            isMobile
              ? "right-0 left-auto max-w-[calc(100vw-1rem)]" // Better positioning on mobile
              : "left-0"
          } ${
            isVisible
              ? "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2"
              : "animate-out fade-out-0 zoom-out-95 slide-out-to-top-2"
          } ${contentClassName}`}
        >
          <div className="flex flex-col gap-1 p-2">
            {Array.isArray(children)
              ? children.map((child, index) =>
                  isValidElement(child) && child.type === DropdownButton
                    ? cloneElement(child as React.ReactElement<DropdownButtonProps>, {
                        onNavigate: closeDropdown,
                        key: index,
                      })
                    : child
                )
              : isValidElement(children) && children.type === DropdownButton
                ? cloneElement(children as React.ReactElement<DropdownButtonProps>, {
                    onNavigate: closeDropdown,
                  })
                : children}
          </div>
        </div>
      )}
    </div>
  );
}

interface DropdownItemProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  style?: "default" | "warning";
}

export function DropdownItem({
  children,
  onClick,
  disabled = false,
  className = "",
  style = "default",
}: DropdownItemProps) {
  const styleClass =
    style === "warning"
      ? "hover:bg-destructive/10 text-red-600 hover:text-red-700"
      : "hover:bg-muted/50 hover:text-foreground";

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    if (!disabled && onClick) {
      onClick();
    }
  };

  return (
    <div
      className={`${styleClass} relative flex cursor-pointer items-center gap-(--spacing-sm) rounded-md px-(--spacing-sm) py-(--spacing-xs) text-sm font-medium transition-colors duration-200 outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 ${
        disabled ? "pointer-events-none opacity-50" : ""
      } ${className}`}
      onClick={handleClick}
    >
      {children}
    </div>
  );
}

interface DropdownLabelProps {
  children: ReactNode;
  className?: string;
}

export function DropdownLabel({ children, className = "" }: DropdownLabelProps) {
  return (
    <div
      className={`text-muted-foreground px-(--spacing-sm) py-(--spacing-xs) text-xs font-semibold tracking-wide uppercase ${className}`}
    >
      {children}
    </div>
  );
}

interface DropdownSeparatorProps {
  className?: string;
}

export function DropdownSeparator({ className = "" }: DropdownSeparatorProps) {
  return <div className={`bg-border/50 mx-2 my-2 h-px ${className}`} />;
}

interface DropdownGroupProps {
  children: ReactNode;
  className?: string;
}

export function DropdownGroup({ children, className = "" }: DropdownGroupProps) {
  return <div className={`flex flex-col gap-1 ${className}`}>{children}</div>;
}

interface DropdownButtonProps {
  children: ReactNode;
  href?: string;
  disabled?: boolean;
  className?: string;
  style?: "default" | "warning";
  onNavigate?: () => void;
}

export function DropdownButton({
  children,
  href,
  disabled = false,
  className = "",
  style = "default",
  onNavigate,
  ...props
}: DropdownButtonProps) {
  const styleClass =
    style === "warning"
      ? "hover:bg-destructive/10 text-red-600 hover:text-red-700"
      : "hover:bg-muted/50 hover:text-foreground";

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    if (disabled) {
      e.preventDefault();
    } else {
      // Close dropdown when navigating
      onNavigate?.();
    }
  };
  const buttonClassName = cn(
    styleClass,
    "relative w-full flex cursor-pointer items-center gap-(--spacing-sm) rounded-(--radius-md) px-(--spacing-sm) py-(--spacing-xs) text-sm font-medium transition-colors duration-200 outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50",
    disabled ? "pointer-events-none opacity-50" : "",
    className
  );

  if (href) {
    return (
      <Link href={href} className={buttonClassName}>
        {children}
      </Link>
    );
  }

  return (
    <button className={buttonClassName} onClick={handleClick} {...props}>
      {children}
    </button>
  );
}
