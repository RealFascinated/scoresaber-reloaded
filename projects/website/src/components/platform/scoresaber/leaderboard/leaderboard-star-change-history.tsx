"use client";

import { StarIcon } from "@heroicons/react/24/solid";
import { LeaderboardStarChange } from "@ssr/common/response/leaderboard-star-change";
import { timeAgo } from "@ssr/common/utils/time-utils";

export function LeaderboardStarChangeHistory({
  starChangeHistory,
}: {
  starChangeHistory: LeaderboardStarChange[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StarIcon className="h-4 w-4 text-yellow-500" />
          <span className="text-sm font-medium">Star History</span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {starChangeHistory.map((starChange, index) => {
          const isCurrent = index === starChangeHistory.length - 1;
          const from =
            starChange.previousStars == 0 ? "Unranked" : starChange.previousStars.toFixed(2);
          const to = starChange.newStars == 0 ? "Unranked" : starChange.newStars.toFixed(2);

          // Determine colors based on star change
          const isIncrease = starChange.newStars > starChange.previousStars;
          const isDecrease = starChange.newStars < starChange.previousStars;
          const fromColor = starChange.previousStars === 0 ? "text-white" : "text-white";
          const toColor =
            starChange.newStars === 0
              ? "text-white"
              : isIncrease
                ? "text-green-500"
                : isDecrease
                  ? "text-red-500"
                  : "text-white";

          return (
            <div
              key={`${starChange.timestamp.toISOString()}-${starChange.previousStars}-${starChange.newStars}`}
              className="flex items-center gap-4 text-sm"
            >
              <span className="text-muted-foreground">{timeAgo(starChange.timestamp)}</span>

              <div className="flex items-center gap-2">
                <span className={fromColor}>{from}</span>
                <span className="text-muted-foreground">→</span>
                <span className={toColor}>
                  {to} {isCurrent && <span className="text-muted-foreground">(Current)</span>}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
