"use client";

import { ScoreBadge, ScoreBadges } from "@/components/score/score-badges";
import { AccSaberScore as AccSaberScoreResponse } from "@ssr/common/api-service/impl/accsaber";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { getScoreBadgeFromAccuracy } from "@ssr/common/utils/song-utils";

export const badges: ScoreBadge<AccSaberScoreResponse, AccSaberScoreResponse["leaderboard"]>[] = [
  {
    name: "AP",
    color: () => "bg-ranked",
    create: (score: AccSaberScoreResponse) => {
      return (
        <div className="flex items-center gap-1">
          <p className="text-sm font-medium text-white">{score.ap.toFixed(2)} AP</p>
        </div>
      );
    },
  },
  {
    name: "Accuracy",
    color: (score: AccSaberScoreResponse) => {
      return getScoreBadgeFromAccuracy(score.acc).color;
    },
    create: (score: AccSaberScoreResponse) => {
      return (
        <div className="flex items-center gap-1">
          <p className="text-sm font-medium text-white">{score.acc.toFixed(2)}%</p>
        </div>
      );
    },
  },
  {
    name: "Score",
    create: (scoreResponse: AccSaberScoreResponse) => {
      return <p>{formatNumberWithCommas(scoreResponse.score.score)}</p>;
    },
  },
];

type AccSaberBadgesProps = {
  score: AccSaberScoreResponse;
};

export function AccSaberBadges({ score }: AccSaberBadgesProps) {
  return (
    <div className="flex h-full flex-col justify-center">
      <div className="grid grid-cols-3 justify-center gap-1">
        <ScoreBadges badges={badges} score={score} leaderboard={score.leaderboard} />
      </div>
    </div>
  );
}
