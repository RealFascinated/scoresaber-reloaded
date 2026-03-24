"use client";

import { HandAccuracyBadge } from "@/components/platform/scoresaber/score/badges/hand-accuracy";
import { ScoreBadge, ScoreBadges } from "@/components/score/score-badges";
import type { EnrichedAccSaberScore } from "@ssr/common/api-service/impl/accsaber";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { getScoreBadgeFromAccuracy } from "@ssr/common/utils/song-utils";

export const badges: ScoreBadge<EnrichedAccSaberScore, EnrichedAccSaberScore["leaderboard"]>[] = [
  {
    name: "AP",
    color: () => "bg-statistic",
    create: (score: EnrichedAccSaberScore) => {
      return (
        <div className="flex items-center gap-1">
          <p className="text-sm font-medium text-white">{score.ap.toFixed(2)} AP</p>
        </div>
      );
    },
  },
  {
    name: "Accuracy",
    color: (score: EnrichedAccSaberScore) => {
      return getScoreBadgeFromAccuracy(score.acc).color;
    },
    create: (score: EnrichedAccSaberScore) => {
      return (
        <div className="flex items-center gap-1">
          <p className="text-sm font-medium text-white">{score.acc.toFixed(2)}%</p>
        </div>
      );
    },
  },
  {
    name: "Score",
    create: (scoreResponse: EnrichedAccSaberScore) => {
      return <p>{formatNumberWithCommas(scoreResponse.score.score)}</p>;
    },
  },
  {
    name: "Left Hand Accuracy",
    color: () => "bg-hands-left",
    create: (score: EnrichedAccSaberScore) => {
      const beatLeaderScore = score.beatLeaderScore;
      if (!beatLeaderScore) {
        return undefined;
      }
      return <HandAccuracyBadge beatLeaderScore={beatLeaderScore} hand="left" />;
    },
  },
  {
    name: "Right Hand Accuracy",
    color: () => "bg-hands-right",
    create: (score: EnrichedAccSaberScore) => {
      const beatLeaderScore = score.beatLeaderScore;
      if (!beatLeaderScore) {
        return undefined;
      }
      return <HandAccuracyBadge beatLeaderScore={beatLeaderScore} hand="right" />;
    },
  },
];

type AccSaberBadgesProps = {
  score: EnrichedAccSaberScore;
};

export function AccSaberBadges({ score }: AccSaberBadgesProps) {
  return (
    <div className="flex h-full flex-col justify-center">
      <div className="grid grid-cols-3 justify-center gap-1 sm:grid-cols-5">
        <ScoreBadges badges={badges} score={score} leaderboard={score.leaderboard} />
      </div>
    </div>
  );
}
