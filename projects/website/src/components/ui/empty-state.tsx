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
      className={cn("bg-secondary/90 flex min-h-[200px] flex-col items-center justify-center p-8", className)}
    >
      <div className="mb-6">
        {icon || <ChartBarIcon className="h-10 w-10 text-gray-400 dark:text-gray-500" />}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      <p className="max-w-[500px] text-center text-sm leading-relaxed text-gray-500 dark:text-gray-400">
        {description}
      </p>
    </div>
  );
}
