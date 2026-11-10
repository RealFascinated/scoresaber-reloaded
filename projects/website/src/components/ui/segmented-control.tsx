import { cn } from "@/common/utils";
import { ReactNode } from "react";

/**
 * A row of mutually exclusive options.
 */
export function SegmentedControl({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="group"
      className={cn("flex max-w-full [scrollbar-width:none] items-center gap-1 overflow-x-auto", className)}
    >
      {children}
    </div>
  );
}

export function SegmentedOption({
  children,
  isActive,
  onClick,
  className,
}: {
  children: ReactNode;
  isActive: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={cn(
        "flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs font-medium whitespace-nowrap transition-colors duration-150 [&_svg]:size-3.5",
        "focus-visible:ring-primary focus-visible:ring-2 focus-visible:outline-hidden",
        isActive
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-hover hover:text-foreground",
        className
      )}
    >
      {children}
    </button>
  );
}
