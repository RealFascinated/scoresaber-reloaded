import { cn } from "@/common/utils";
import { ReactNode } from "react";
import SimpleTooltip from "../simple-tooltip";

export function ControlPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("ring-border bg-card rounded-xl p-4 ring-1", className)}>{children}</div>;
}

export function ControlRow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex justify-center", className)}>{children}</div>;
}

export function TabGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("bg-muted/50 w-fit rounded-lg p-1", className)}>
      <div className={cn("flex w-fit flex-wrap justify-center gap-1")}>{children}</div>
    </div>
  );
}

export function Tab({
  children,
  isActive,
  onClick,
  tooltip,
  activeClassName,
  className,
}: {
  children: ReactNode;
  isActive: boolean;
  onClick: () => void;
  tooltip?: string;
  activeClassName?: string;
  className?: string;
}) {
  const button = (
    <button
      className={cn(
        "relative flex cursor-pointer items-center gap-1.5 rounded-md border border-transparent px-3 py-1.5 text-xs font-medium transition-all duration-200",
        "focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden",
        isActive
          ? (activeClassName ?? "bg-primary/40 border-primary text-primary-foreground")
          : "text-foreground/70 hover:bg-accent hover:text-accent-foreground",
        className
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );

  if (tooltip) {
    return <SimpleTooltip display={tooltip}>{button}</SimpleTooltip>;
  }

  return button;
}

export function ButtonGroup({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap justify-center gap-1.5", className)}>{children}</div>;
}

export function ControlButton({
  children,
  isActive,
  onClick,
  type = "button",
  className,
  ...props
}: {
  children: ReactNode;
  isActive: boolean;
  onClick: () => void;
  type?: "button" | "submit" | "reset";
  className?: string;
}) {
  return (
    <button
      className={cn(
        "flex h-9 cursor-pointer items-center gap-2 rounded-md border px-3.5 text-sm transition-all",
        isActive
          ? "bg-primary/40 text-primary-foreground border-primary"
          : "bg-control text-muted-foreground border-border hover:bg-accent",
        className
      )}
      onClick={onClick}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
