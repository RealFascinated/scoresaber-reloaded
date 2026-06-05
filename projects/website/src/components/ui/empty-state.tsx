import { cn } from "@/common/utils";
import { SharedIcons } from "@/shared-icons";
import { ReactNode } from "react";

interface EmptyStateProps {
  /**
   * The icon to display in the empty state.
   * @default LeaderboardEmptyStateIcon
   */
  icon?: ReactNode;

  /**
   * The title of the empty state.
   */
  title: string;

  /**
   * The description of the empty state.
   */
  description: string;

  /**
   * Optional className to extend the styling.
   */
  className?: string;
}

export function EmptyState({ icon, title, description, className }: EmptyStateProps) {
  return (
    <div
      className={cn("bg-secondary/90 flex min-h-[200px] flex-col items-center justify-center p-8", className)}
    >
      <div className="mb-6">
        {icon || <SharedIcons.LeaderboardEmptyStateIcon className="text-muted-foreground h-10 w-10" />}
      </div>
      <h3 className="text-foreground mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground max-w-[500px] text-center text-sm leading-relaxed">{description}</p>
    </div>
  );
}
