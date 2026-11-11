"use client";

import { cn } from "@/common/utils";
import { EmptyState } from "@/components/ui/empty-state";
import PageTransition from "@/components/ui/page-transition";
import { Skeleton } from "@/components/ui/skeleton";
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
  /**
   * Number of placeholder rows shown while the first page loads; should match the page size.
   * @default 8
   */
  loadingRows?: number;
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
  loadingRows = 8,
}: ScoresListPanelProps<T>) {
  // Mirrors the loaded list (same wrapper, one row per score, pagination) so the page keeps its height when
  // the scores arrive. A smaller placeholder collapses the page and shifts the scroll position.
  if (isLoading && data === undefined) {
    return (
      <>
        {/* Same (empty) element as the loaded state, since the parent's gap applies to it as well */}
        <div className="text-center" />
        <div
          className={cn(
            "divide-border grid min-w-full grid-cols-1 divide-y",
            // Rows are 80px (72px for the first and last, which drop their outer padding) plus the 1px divider
            "[&>div:first-child]:h-[72px] [&>div:last-child]:h-[73px]"
          )}
        >
          {Array.from({ length: loadingRows }).map((_, index) => (
            <div key={index} className="flex h-[81px] items-center py-2">
              <Skeleton className="size-full rounded-lg" />
            </div>
          ))}
        </div>
        <div className="flex w-full justify-center">
          <div className="flex h-9 items-center gap-1.5">
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-10 rounded-md" />
            ))}
          </div>
        </div>
      </>
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
