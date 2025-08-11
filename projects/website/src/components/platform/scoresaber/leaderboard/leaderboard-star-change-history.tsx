"use client";

import { Button } from "@/components/ui/button";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { StarIcon } from "@heroicons/react/24/solid";
import { LeaderboardStarChange } from "@ssr/common/response/leaderboard-star-change";
import { useState } from "react";

export function LeaderboardStarChangeHistory({
  starChangeHistory,
}: {
  starChangeHistory: LeaderboardStarChange[];
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button
        variant="ghost"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm"
      >
        <StarIcon className="h-4 w-4 text-yellow-500" />
        Star History ({starChangeHistory.length})
        <ChevronDownIcon className="h-3 w-3" />
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StarIcon className="h-4 w-4 text-yellow-500" />
          <span className="text-sm font-medium">Star History</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="h-6 w-6 p-0">
          <ChevronUpIcon className="h-3 w-3" />
        </Button>
      </div>

      <div className="flex flex-col gap-1">
        {starChangeHistory.map(starChange => {
          const from =
            starChange.previousStars == 0 ? "Unranked" : starChange.previousStars.toFixed(2);
          const to = starChange.newStars == 0 ? "Unranked" : starChange.newStars.toFixed(2);

          return (
            <div key={starChange.timestamp.toISOString()} className="flex items-center gap-4">
              <span className="text-muted-foreground">
                {starChange.timestamp.toLocaleDateString()}
              </span>

              <div className="flex items-center gap-2">
                <span>{from}</span>
                <span className="text-muted-foreground">→</span>
                <span>{to}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
