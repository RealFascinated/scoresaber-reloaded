"use client";

import { getRankColor } from "@/common/rank-color-utils";
import { cn } from "@/common/utils";
import { ScoreTimeSet } from "@/components/score/score-time-set";
import { SharedIcons } from "@/shared-icons";
import type { ScoreResponse } from "@ssr/common/schemas/accsaber/score/score";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";

type AccSaberRankTimeProps = {
  score: ScoreResponse;
};

export function AccSaberRankTime({ score }: AccSaberRankTimeProps) {
  return (
    <div className="flex w-full flex-row items-center justify-between lg:w-[120px] lg:flex-col lg:justify-center">
      <div className="flex items-center gap-1">
        <SharedIcons.AccSaberGlobalRankIcon className="h-5 w-5" />
        <p
          className={cn(
            getRankColor(score.rank),
            "hover:text-primary/80 cursor-pointer font-semibold transition-all"
          )}
        >
          #{formatNumberWithCommas(score.rank)}
        </p>
      </div>
      <div className="flex items-center gap-2 lg:flex-col lg:gap-0">
        <ScoreTimeSet timestamp={new Date(score.timeSet)} />
      </div>
    </div>
  );
}
