import { cn } from "@/common/utils";
import { ReactNode } from "react";
import SimpleTooltip from "../simple-tooltip";

interface ControlPanelProps {
  children: ReactNode;
  className?: string;
}

export function ControlPanel({ children, className }: ControlPanelProps) {
  return (
    <div className={cn("border-border/50 bg-background/50 rounded-lg border p-4", className)}>
      {children}
    </div>
  );
}

interface ControlRowProps {
  children: ReactNode;
  className?: string;
}

export function ControlRow({ children, className = "" }: ControlRowProps) {
  return <div className={cn("mb-3 flex justify-center", className)}>{children}</div>;
}

interface TabGroupProps {
  children: ReactNode;
  className?: string;
}

export function TabGroup({ children, className }: TabGroupProps) {
  return (
    <div className={cn("bg-muted w-fit rounded-md p-0.5", className)}>
      <div className={cn("flex w-fit flex-wrap justify-center gap-0.5")}>{children}</div>
    </div>
  );
}

interface TabProps {
  children: ReactNode;
  isActive: boolean;
  onClick: () => void;
  tooltip?: string;
}

export function Tab({ children, isActive, onClick, tooltip }: TabProps) {
  return (
    <SimpleTooltip display={tooltip}>
      <button
        className={cn(
          "flex cursor-pointer items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-all",
          isActive
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        )}
        onClick={onClick}
      >
        {children}
      </button>
    </SimpleTooltip>
  );
}

interface ButtonGroupProps {
  children: ReactNode;
  className?: string;
}

export function ButtonGroup({ children, className = "" }: ButtonGroupProps) {
  return <div className={cn("flex flex-wrap justify-center gap-1.5", className)}>{children}</div>;
}

interface ControlButtonProps {
  children: ReactNode;
  isActive: boolean;
  onClick: () => void;
  className?: string;
}

export function ControlButton({ children, isActive, onClick, className = "" }: ControlButtonProps) {
  return (
    <button
      className={cn(
        "flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-all",
        isActive
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-muted-foreground border-border hover:bg-muted"
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
