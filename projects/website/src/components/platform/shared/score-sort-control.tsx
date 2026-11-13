"use client";

import { Spinner } from "@/components/spinner";
import { SegmentedControl, SegmentedOption } from "@/components/ui/segmented-control";
import { SharedIcons } from "@/shared-icons";
import type { SortDirection } from "@ssr/common/schemas/score/query/sort/sort-direction";
import type { SortOption } from "./use-player-scores-query";

interface ScoreSortControlProps<T extends string> {
  options: SortOption<T>[];
  activeSort: T;
  direction: SortDirection;
  /** When true, the active option shows the sort direction arrow instead of its own icon. */
  hasDirection: boolean;
  isBusy: boolean;
  onSortChange: (value: T, defaultOrder: SortDirection) => void;
}

/**
 * Sort selector shared by the player score tabs.
 */
export default function ScoreSortControl<T extends string>({
  options,
  activeSort,
  direction,
  hasDirection,
  isBusy,
  onSortChange,
}: ScoreSortControlProps<T>) {
  function renderIcon(option: SortOption<T>, isActive: boolean) {
    if (!isActive) {
      return option.icon;
    }
    if (isBusy) {
      return <Spinner size="sm" className="size-4 text-current" />;
    }
    if (!hasDirection) {
      return option.icon;
    }
    return direction === "desc" ? (
      <SharedIcons.SortDescendingIcon className="size-4" />
    ) : (
      <SharedIcons.SortAscendingIcon className="size-4" />
    );
  }

  return (
    <SegmentedControl>
      {options.map(option => {
        const isActive = option.value === activeSort;
        return (
          <SegmentedOption
            key={option.value}
            isActive={isActive}
            onClick={() => onSortChange(option.value, option.defaultOrder ?? "desc")}
          >
            {renderIcon(option, isActive)}
            {option.name}
          </SegmentedOption>
        );
      })}
    </SegmentedControl>
  );
}
