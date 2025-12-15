"use client";

import { cn } from "@/common/utils";
import SimpleTooltip from "@/components/simple-tooltip";
import { StarIcon } from "@heroicons/react/24/solid";
import { LeaderboardStarChange } from "@ssr/common/schemas/leaderboard/leaderboard-star-change";
import { formatDate, timeAgo } from "@ssr/common/utils/time-utils";
import { ArrowRightIcon, ChevronDownIcon, ChevronUpIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { useState } from "react";

function LeaderboardStarChangeHistoryButton({ onClick, isOpen }: { onClick: () => void; isOpen: boolean }) {
  return (
    <button
      className="border-border bg-background/95 text-foreground hover:bg-accent/50 hover:border-primary/50 focus-visible:ring-primary/50 flex items-center gap-(--spacing-sm) rounded-(--radius-lg) border px-(--spacing-lg) py-(--spacing-sm) text-sm font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none"
      onClick={onClick}
    >
      <StarIcon className="h-4 w-4 text-yellow-500" />
      Show Ranked Changes
      {isOpen ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
    </button>
  );
}

export function LeaderboardStarChangeHistory({ starChangeHistory }: { starChangeHistory: LeaderboardStarChange[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex w-full flex-col items-center justify-center gap-(--spacing-lg)">
      <LeaderboardStarChangeHistoryButton onClick={() => setOpen(!open)} isOpen={open} />
      {open && (
        <div className="animate-in slide-in-from-top-2 w-full duration-200">
          <div className="border-border bg-background/80 rounded-(--radius-lg) border p-(--spacing-sm)">
            <div className="space-y-1">
              {starChangeHistory.map((starChange, index) => {
                const isCurrent = index === 0;
                const from = starChange.previousStars == 0 ? "Unranked" : starChange.previousStars.toFixed(2);
                const to = starChange.newStars == 0 ? "Unranked" : starChange.newStars.toFixed(2);

                // Determine colors and icons based on star change
                const isIncrease = starChange.newStars > starChange.previousStars;
                const isDecrease = starChange.newStars < starChange.previousStars;
                const isUnrankedToRanked = starChange.previousStars === 0 && starChange.newStars > 0;
                const isRankedToUnranked = starChange.previousStars > 0 && starChange.newStars === 0;

                // Determine change type for better visual representation
                const changeType = isUnrankedToRanked
                  ? "new"
                  : isRankedToUnranked
                    ? "removed"
                    : isIncrease
                      ? "increase"
                      : "decrease";

                return (
                  <div
                    key={`${starChange.timestamp.toISOString()}-${starChange.previousStars}-${starChange.newStars}`}
                    className={cn(
                      "hover:bg-accent/30 flex items-center justify-between rounded-(--radius-md) px-(--spacing-sm) py-(--spacing-xs) text-xs transition-colors duration-200",
                      isCurrent && "bg-primary/10"
                    )}
                  >
                    {/* Timestamp and change indicator */}
                    <div className="flex items-center gap-(--spacing-sm)">
                      <SimpleTooltip
                        display={<p>{formatDate(new Date(starChange.timestamp), "Do MMMM, YYYY HH:mm a")}</p>}
                      >
                        <span className="text-muted-foreground">{timeAgo(starChange.timestamp)}</span>
                      </SimpleTooltip>
                      {changeType === "increase" && <TrendingUpIcon className="h-3 w-3 text-green-500" />}
                      {changeType === "decrease" && <TrendingDownIcon className="h-3 w-3 text-red-500" />}
                      {changeType === "new" && <StarIcon className="h-3 w-3 text-yellow-500" />}
                      {changeType === "removed" && <StarIcon className="h-3 w-3 text-gray-500" />}
                      {isCurrent && (
                        <span className="bg-primary/20 text-primary rounded-full px-(--spacing-md) py-(--spacing-xs) text-xs font-medium">
                          Current
                        </span>
                      )}
                    </div>

                    {/* Star change display */}
                    <div className="flex items-center gap-(--spacing-md)">
                      {/* From */}
                      <div
                        className={cn(
                          "flex items-center gap-(--spacing-xs) rounded px-(--spacing-md) py-(--spacing-xs) text-xs font-medium",
                          starChange.previousStars === 0
                            ? "bg-muted/50 text-muted-foreground"
                            : isDecrease || isRankedToUnranked
                              ? "bg-green-500/10 text-green-600 dark:text-green-400" // Higher to lower or ranked to unranked
                              : "bg-red-500/10 text-red-600 dark:text-red-400" // Lower to higher
                        )}
                      >
                        {starChange.previousStars > 0 && <StarIcon className="h-3 w-3" />}
                        <span className="font-mono">{from}</span>
                      </div>

                      {/* Arrow */}
                      <ArrowRightIcon className="text-muted-foreground h-3 w-3" />

                      {/* To */}
                      <div
                        className={cn(
                          "flex items-center gap-(--spacing-xs) rounded px-(--spacing-md) py-(--spacing-xs) text-xs font-medium",
                          starChange.newStars === 0
                            ? "bg-muted/50 text-muted-foreground"
                            : isUnrankedToRanked || isIncrease
                              ? "bg-green-500/10 text-green-600 dark:text-green-400"
                              : "bg-red-500/10 text-red-600 dark:text-red-400"
                        )}
                      >
                        <StarIcon className="h-3 w-3" />
                        <span className="font-mono">{to}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
