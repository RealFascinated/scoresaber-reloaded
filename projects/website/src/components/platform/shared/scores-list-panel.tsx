"use client";

import { cn } from "@/common/utils";
import { Spinner } from "@/components/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import PageTransition from "@/components/ui/page-transition";
import { SharedIcons } from "@/shared-icons";
import { Page } from "@ssr/common/pagination";
import { ReactNode } from "react";
import SimplePagination from "../../simple-pagination";

type ScoresListPanelProps<T> = {
  page: number;
  data: Page<T> | undefined;
  isLoading: boolean;
  isRefetching: boolean;
  isError: boolean;
  generatePageUrl: (page: number) => string;
  onPageChange: (page: number) => void;
  renderItem: (item: T) => ReactNode;
  getKey: (item: T) => string;
  /**
   * Class applied to each score row wrapper.
   * @default "cv-score-card"
   */
  itemClassName?: string;
};

/**
 * Shared list + pagination rendering for the player platform score tabs.
 * Handles loading, error and empty states.
 */
export default function ScoresListPanel<T>({
  page,
  data,
  isLoading,
  isRefetching,
  isError,
  generatePageUrl,
  onPageChange,
  renderItem,
  getKey,
  itemClassName = "cv-score-card",
}: ScoresListPanelProps<T>) {
  if (isLoading && data === undefined) {
    return (
      <div className="flex w-full justify-center py-8">
        <Spinner size="md" className="text-primary" />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <>
      <div className="text-center">
        {isError || data.items.length === 0 ? (
          <EmptyState
            className="ring-border rounded-xl ring-1"
            title={isError ? "Failed to Load Scores" : "No Results"}
            description={
              isError ? "There was an error loading these scores" : "No scores were found on this page"
            }
            icon={isError ? <SharedIcons.WarningAlertIcon /> : <SharedIcons.SearchNoResultsIcon />}
          />
        ) : null}
      </div>

      <PageTransition
        className={cn(
          "divide-border grid min-w-full grid-cols-1 divide-y",
          "[&>div:first-child_[data-ss-score-row]]:pt-0 [&>div:last-child_[data-ss-score-row]]:pb-0"
        )}
      >
        {data.items.map(item => (
          <div key={getKey(item)} className={itemClassName}>
            {renderItem(item)}
          </div>
        ))}
      </PageTransition>

      <SimplePagination
        page={page}
        totalItems={data.metadata.totalItems}
        itemsPerPage={data.metadata.itemsPerPage}
        loadingPage={isLoading || isRefetching ? page : undefined}
        generatePageUrl={generatePageUrl}
        onPageChange={onPageChange}
      />
    </>
  );
}
