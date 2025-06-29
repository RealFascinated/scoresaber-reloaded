"use client";

import { getRankColor } from "@/common/rank-color-utils";
import { ScoreTimeSet } from "@/components/score/score-time-set";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import { AccSaberScore } from "@ssr/common/api-service/impl/accsaber";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { useMemo } from "react";

type AccSaberRankTimeProps = {
  score: AccSaberScore;
};

export function AccSaberRankTime({ score }: AccSaberRankTimeProps) {
  const rankElement = useMemo(() => {
    return (
      <p
        className={`${getRankColor(score.score.rank)} cursor-pointer font-semibold transition-all hover:brightness-[66%]`}
      >
        #{formatNumberWithCommas(score.score.rank)}
      </p>
    );
  }, [score.score.rank]);

  const timeInfo = useMemo(
    () => (
      <div className="flex items-center gap-2 lg:flex-col lg:gap-0">
        <ScoreTimeSet timestamp={score.timeSet} />
      </div>
    ),
    [score]
  );

  return (
    <div className="flex w-full flex-row items-center justify-between lg:w-[125px] lg:flex-col lg:justify-center">
      <div className="flex items-center gap-1">
        <GlobeAmericasIcon className="h-5 w-5" />
        {rankElement}
      </div>
      {timeInfo}
    </div>
  );
}
