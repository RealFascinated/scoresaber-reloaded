import { cn } from "@/common/utils";
import { ReactNode } from "react";

/**
 * A row of text tabs where the active tab is marked by an underline. Meant to sit on a bottom border
 * (e.g. a card header), which the underline overlaps.
 */
export function UnderlineTabs({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex h-full max-w-full [scrollbar-width:none] items-stretch gap-5 overflow-x-auto",
        className
      )}
    >
      {children}
    </div>
  );
}

export function UnderlineTab({
  children,
  isActive,
  onClick,
}: {
  children: ReactNode;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      className={cn(
        "relative flex shrink-0 cursor-pointer items-center gap-2 text-sm font-medium whitespace-nowrap transition-colors duration-150",
        "focus-visible:ring-primary focus-visible:rounded-sm focus-visible:ring-2 focus-visible:outline-hidden",
        // The underline sits right on top of the parent's bottom border
        "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:transition-colors",
        isActive
          ? "text-foreground after:bg-brand"
          : "text-muted-foreground hover:text-foreground after:bg-transparent [&>:not(span)]:opacity-60 [&>:not(span)]:grayscale hover:[&>:not(span)]:opacity-100 hover:[&>:not(span)]:grayscale-0"
      )}
    >
      {children}
    </button>
  );
}
