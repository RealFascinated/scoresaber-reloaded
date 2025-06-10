"use client";

import { getRankColor } from "@/common/color-utils";
import { ScoreTimeSet } from "@/components/score/score-time-set";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import { AccSaberScore } from "@ssr/common/api-service/impl/accsaber";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { getPageFromRank } from "@ssr/common/utils/utils";
import Link from "next/link";
import { useMemo } from "react";

type AccSaberRankTimeProps = {
  score: AccSaberScore;
};

export function AccSaberRankTime({ score }: AccSaberRankTimeProps) {
  const rankElement = useMemo(() => {
    return (
      <Link
        prefetch={false}
        href={`/leaderboard/${score.leaderboardId}/${getPageFromRank(score.score.rank, 12)}`}
      >
        <p
          className={`${getRankColor(score.score.rank)} hover:brightness-[66%] transition-all cursor-pointer`}
        >
          #{formatNumberWithCommas(score.score.rank)}
        </p>
      </Link>
    );
  }, [score.score.rank, score.leaderboardId]);

  const timeInfo = useMemo(
    () => (
      <div className="flex items-center gap-2 lg:flex-col lg:gap-0">
        <ScoreTimeSet timestamp={score.timeSet} />
      </div>
    ),
    [score]
  );

  return (
    <div className="flex w-full flex-row justify-between lg:w-[125px] lg:flex-col lg:justify-center items-center">
      <div className="flex gap-1 items-center">
        <GlobeAmericasIcon className="w-5 h-5" />
        {rankElement}
      </div>
      {timeInfo}
    </div>
  );
}
