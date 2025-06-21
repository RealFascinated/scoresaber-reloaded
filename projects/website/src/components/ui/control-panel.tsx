import { ReactNode } from "react";
import SimpleTooltip from "../simple-tooltip";

interface ControlPanelProps {
  children: ReactNode;
}

export function ControlPanel({ children }: ControlPanelProps) {
  return <div className="border-border/50 bg-background/50 rounded-lg border p-4">{children}</div>;
}

interface ControlRowProps {
  children: ReactNode;
  className?: string;
}

export function ControlRow({ children, className = "" }: ControlRowProps) {
  return <div className={`mb-3 flex justify-center ${className}`}>{children}</div>;
}

interface TabGroupProps {
  children: ReactNode;
}

export function TabGroup({ children }: TabGroupProps) {
  return (
    <div className="bg-muted w-fit rounded-md p-0.5">
      <div className="flex w-fit flex-wrap justify-center gap-0.5">{children}</div>
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
  const button = (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-all ${
        isActive
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );

  if (tooltip) {
    return <SimpleTooltip display={tooltip}>{button}</SimpleTooltip>;
  }

  return button;
}

interface ButtonGroupProps {
  children: ReactNode;
  className?: string;
}

export function ButtonGroup({ children, className = "" }: ButtonGroupProps) {
  return <div className={`flex flex-wrap justify-center gap-1.5 ${className}`}>{children}</div>;
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
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-all ${
        isActive
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
      } ${className}`}
    >
      {children}
    </button>
  );
}
