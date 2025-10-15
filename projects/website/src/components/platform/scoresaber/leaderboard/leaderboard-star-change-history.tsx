"use client";

import { cn } from "@/common/utils";
import { StarIcon } from "@heroicons/react/24/solid";
import { LeaderboardStarChange } from "@ssr/common/response/leaderboard-star-change";
import { timeAgo } from "@ssr/common/utils/time-utils";
import { ArrowRightIcon, ChevronDownIcon, ChevronUpIcon, TrendingUpIcon, TrendingDownIcon } from "lucide-react";
import { useState } from "react";

function LeaderboardStarChangeHistoryButton({
  onClick,
  isOpen,
}: {
  onClick: () => void;
  isOpen: boolean;
}) {
  return (
    <button
      className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/95 px-3 py-2 text-sm font-medium text-foreground transition-all hover:bg-accent/50 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
      onClick={onClick}
    >
      <StarIcon className="h-4 w-4 text-yellow-500" />
      Show Ranked Changes
      {isOpen ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
    </button>
  );
}

export function LeaderboardStarChangeHistory({
  starChangeHistory,
}: {
  starChangeHistory: LeaderboardStarChange[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex w-full flex-col items-center justify-center gap-3">
      <LeaderboardStarChangeHistoryButton onClick={() => setOpen(!open)} isOpen={open} />
      {open && (
        <div className="w-full animate-in slide-in-from-top-2 duration-200">
          <div className="rounded-lg border border-border/30 bg-background/80 p-2 shadow-sm">
            <div className="space-y-1">
              {starChangeHistory.map((starChange, index) => {
                const isCurrent = index === 0;
                const from =
                  starChange.previousStars == 0 ? "Unranked" : starChange.previousStars.toFixed(2);
                const to = starChange.newStars == 0 ? "Unranked" : starChange.newStars.toFixed(2);

                // Determine colors and icons based on star change
                const isIncrease = starChange.newStars > starChange.previousStars;
                const isDecrease = starChange.newStars < starChange.previousStars;
                const isUnrankedToRanked = starChange.previousStars === 0 && starChange.newStars > 0;
                const isRankedToUnranked = starChange.previousStars > 0 && starChange.newStars === 0;

                // Determine change type for better visual representation
                const changeType = isUnrankedToRanked ? "new" : isRankedToUnranked ? "removed" : isIncrease ? "increase" : "decrease";

                return (
                  <div
                    key={`${starChange.timestamp.toISOString()}-${starChange.previousStars}-${starChange.newStars}`}
                    className={cn(
                      "flex items-center justify-between rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-accent/30",
                      isCurrent && "bg-primary/10"
                    )}
                  >
                    {/* Timestamp and change indicator */}
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{timeAgo(starChange.timestamp)}</span>
                      {changeType === "increase" && <TrendingUpIcon className="h-3 w-3 text-green-500" />}
                      {changeType === "decrease" && <TrendingDownIcon className="h-3 w-3 text-red-500" />}
                      {changeType === "new" && <StarIcon className="h-3 w-3 text-yellow-500" />}
                      {changeType === "removed" && <StarIcon className="h-3 w-3 text-gray-500" />}
                      {isCurrent && (
                        <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-xs font-medium text-primary">
                          Current
                        </span>
                      )}
                    </div>

                    {/* Star change display */}
                    <div className="flex items-center gap-1.5">
                      {/* From */}
                      <div className={cn(
                        "flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium",
                        starChange.previousStars === 0 
                          ? "bg-muted/50 text-muted-foreground" 
                          : isDecrease || isRankedToUnranked
                            ? "bg-green-500/10 text-green-600 dark:text-green-400" // Higher to lower or ranked to unranked
                            : "bg-red-500/10 text-red-600 dark:text-red-400" // Lower to higher
                      )}>
                        {starChange.previousStars > 0 && <StarIcon className="h-3 w-3" />}
                        <span className="font-mono">{from}</span>
                      </div>

                      {/* Arrow */}
                      <ArrowRightIcon className="h-3 w-3 text-muted-foreground" />

                      {/* To */}
                      <div className={cn(
                        "flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium",
                        starChange.newStars === 0 
                          ? "bg-muted/50 text-muted-foreground" 
                          : isUnrankedToRanked || isIncrease
                            ? "bg-green-500/10 text-green-600 dark:text-green-400"
                            : "bg-red-500/10 text-red-600 dark:text-red-400"
                      )}>
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
