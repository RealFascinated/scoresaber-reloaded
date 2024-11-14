"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as React from "react";
import { cn } from "@/common/utils";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = ({ alwaysOpen, children }: { alwaysOpen?: boolean; children: React.ReactNode }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <TooltipPrimitive.Root open={alwaysOpen || open} onOpenChange={setOpen}>
      <div
        onClick={e => {
          setOpen(true);
        }}
        onKeyUp={e => {
          if (e.key === "Enter" || e.key === " ") {
            setOpen(true);
          }
        }}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") {
            setOpen(true);
          }
        }}
      >
        {children}
      </div>
    </TooltipPrimitive.Root>
  );
};

const TooltipTrigger = ({
  onClick,
  onFocus,
  onBlur,
  onKeyUp,
  onKeyDown,
  children,
  asChild = true,
  className,
}: {
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onFocus?: React.FocusEventHandler<HTMLDivElement>;
  onBlur?: React.FocusEventHandler<HTMLDivElement>;
  onKeyUp?: React.KeyboardEventHandler<HTMLDivElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
}) => {
  const [open, setOpen] = React.useState(false);

  const handleKeyEvents = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (onKeyUp) onKeyUp(event);
    if (onKeyDown) onKeyDown(event);
    if (event.key === "Enter" || event.key === " ") {
      setOpen(prevOpen => !prevOpen);
    }
  };

  return (
    <TooltipPrimitive.Trigger asChild={asChild} className={className}>
      <div
        tabIndex={0}
        role="button"
        onClick={e => {
          setOpen(prevOpen => !prevOpen);
          if (onClick) onClick(e);
        }}
        onFocus={e => {
          setTimeout(() => setOpen(true), 0);
          if (onFocus) onFocus(e);
        }}
        onBlur={e => {
          setOpen(false);
          if (onBlur) onBlur(e);
        }}
        onKeyUp={handleKeyEvents}
        onKeyDown={handleKeyEvents}
      >
        {children}
      </div>
    </TooltipPrimitive.Trigger>
  );
};

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
