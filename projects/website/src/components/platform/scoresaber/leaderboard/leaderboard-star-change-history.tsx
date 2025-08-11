"use client";

import { cn } from "@/common/utils";
import { StarIcon } from "@heroicons/react/24/solid";
import { LeaderboardStarChange } from "@ssr/common/response/leaderboard-star-change";
import { timeAgo } from "@ssr/common/utils/time-utils";
import { ArrowRightIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useState } from "react";

function LeaderboardStarChangeHistoryButton({
  onClick,
  isOpen,
}: {
  onClick: () => void;
  isOpen: boolean;
}) {
  return (
    <span className="flex cursor-pointer items-center gap-2 text-sm" onClick={onClick}>
      Show Ranked Changes{" "}
      {isOpen ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />}
    </span>
  );
}

export function LeaderboardStarChangeHistory({
  starChangeHistory,
}: {
  starChangeHistory: LeaderboardStarChange[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex w-full flex-col items-center justify-center gap-2">
      <LeaderboardStarChangeHistoryButton onClick={() => setOpen(!open)} isOpen={open} />
      {open && (
        <div className="flex w-full flex-col gap-2">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <StarIcon className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Ranked Changes</span>
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
                  className="flex items-center gap-3 text-sm"
                >
                  <span className="text-muted-foreground">{timeAgo(starChange.timestamp)}</span>

                  <div className="flex items-center gap-2">
                    {/* From */}
                    <div className={cn(fromColor, "flex items-center gap-2")}>
                      {starChange.previousStars > 0 && <StarIcon className="h-4 w-4" />}
                      {from}
                    </div>

                    {/* Separator */}
                    <span className="text-muted-foreground">
                      <ArrowRightIcon className="h-4 w-4" />
                    </span>

                    {/* To */}
                    <div className={cn(toColor, "flex items-center gap-2")}>
                      <StarIcon className="h-4 w-4" />
                      {to} {isCurrent && <span className="text-muted-foreground">(Current)</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
