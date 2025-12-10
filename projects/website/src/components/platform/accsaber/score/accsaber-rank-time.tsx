"use client";

import { getRankColor } from "@/common/rank-color-utils";
import { cn } from "@/common/utils";
import { ScoreTimeSet } from "@/components/score/score-time-set";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import { AccSaberScore } from "@ssr/common/api-service/impl/accsaber";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";

type AccSaberRankTimeProps = {
  score: AccSaberScore;
};

export function AccSaberRankTime({ score }: AccSaberRankTimeProps) {
  return (
    <div className="flex w-full flex-row items-center justify-between lg:w-[125px] lg:flex-col lg:justify-center">
      <div className="flex items-center gap-1">
        <GlobeAmericasIcon className="h-5 w-5" />
        <p
          className={cn(
            getRankColor(score.score.rank),
            "hover:text-primary/80 cursor-pointer font-semibold transition-all"
          )}
        >
          #{formatNumberWithCommas(score.score.rank)}
        </p>
      </div>
      <div className="flex items-center gap-2 lg:flex-col lg:gap-0">
        <ScoreTimeSet timestamp={score.timeSet} />
      </div>
    </div>
  );
}
