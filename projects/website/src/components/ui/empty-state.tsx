import { cn } from "@/common/utils";
import { ChartBarIcon } from "@heroicons/react/24/outline";
import { ReactNode } from "react";

interface EmptyStateProps {
  /**
   * The icon to display in the empty state.
   * @default ChartBarIcon
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
      className={cn(
        "flex flex-col items-center justify-center min-h-[200px] p-8 rounded-xl",
        "bg-accent-deep/50 border border-border/50 backdrop-blur-sm",
        className
      )}
    >
      <div className="mb-6">
        {icon || <ChartBarIcon className="w-10 h-10 text-gray-400 dark:text-gray-500" />}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-[400px] leading-relaxed">
        {description}
      </p>
    </div>
  );
}
