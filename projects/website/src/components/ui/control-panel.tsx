import { cn } from "@/common/utils";
import { ReactNode } from "react";
import SimpleTooltip from "../simple-tooltip";

export function ControlPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("border-border bg-background/50 rounded-lg border p-4", className)}>{children}</div>
  );
}

export function ControlRow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={cn("mb-3 flex justify-center", className)}>{children}</div>;
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
}: {
  children: ReactNode;
  isActive: boolean;
  onClick: () => void;
  tooltip?: string;
}) {
  const button = (
    <button
      className={cn(
        "relative flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200",
        "focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        isActive
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
  ...props
}: {
  children: ReactNode;
  isActive: boolean;
  onClick: () => void;
  type?: "button" | "submit" | "reset";
}) {
  return (
    <button
      className={cn(
        "flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-all",
        isActive
          ? "bg-primary/40 text-primary-foreground border-primary"
          : "bg-background text-muted-foreground border-border hover:bg-muted"
      )}
      onClick={onClick}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
