import { cn } from "@/common/utils";
import { SharedIcons } from "@/shared-icons";
import { ReactNode } from "react";

interface EmptyStateProps {
  /**
   * The icon to display in the empty state.
   * @default LeaderboardEmptyStateIcon
   */
  icon?: ReactNode;

  title: string;

  description: string;

  className?: string;
}

export function EmptyState({ icon, title, description, className }: EmptyStateProps) {
  return (
    <div
      className={cn("bg-secondary/90 flex min-h-[200px] flex-col items-center justify-center p-8", className)}
    >
      <div className="mb-6">
        {icon || <SharedIcons.LeaderboardEmptyStateIcon className="h-10 w-10 text-muted-foreground" />}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
      <p className="max-w-[500px] text-center text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
