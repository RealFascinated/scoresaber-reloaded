"use client";

import { HandAccuracyBadge } from "@/components/platform/scoresaber/score/badges/hand-accuracy";
import { ScoreBadge, ScoreBadges } from "@/components/score/score-badges";
import { AccSaberScoreItem } from "@ssr/common/schemas/response/score/accsaber-scores-page";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { getScoreBadgeFromAccuracy } from "@ssr/common/utils/song-utils";

export const badges: ScoreBadge<AccSaberScoreItem, AccSaberScoreItem>[] = [
  {
    name: "AP",
    color: () => "bg-statistic",
    create: (score: AccSaberScoreItem) => {
      return (
        <div className="flex cursor-default flex-col items-center justify-center">
          <p>{score.ap.toFixed(2)} AP</p>
        </div>
      );
    },
  },
  {
    name: "Accuracy",
    color: (score: AccSaberScoreItem) => {
      return getScoreBadgeFromAccuracy(score.accuracy * 100).color;
    },
    create: (score: AccSaberScoreItem) => {
      return (
        <div className="flex cursor-default flex-col items-center justify-center">
          <p>{(score.accuracy * 100).toFixed(2)}%</p>
        </div>
      );
    },
  },
  {
    name: "Score",
    create: (scoreResponse: AccSaberScoreItem) => {
      return (
        <div className="flex flex-col items-center justify-center">
          <p>{formatNumberWithCommas(scoreResponse.score)}</p>
        </div>
      );
    },
  },
  {
    name: "Left Hand Accuracy",
    color: () => "bg-hands-left",
    create: (score: AccSaberScoreItem) => {
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
    create: (score: AccSaberScoreItem) => {
      const beatLeaderScore = score.beatLeaderScore;
      if (!beatLeaderScore) {
        return undefined;
      }
      return <HandAccuracyBadge beatLeaderScore={beatLeaderScore} hand="right" />;
    },
  },
];

type AccSaberBadgesProps = {
  score: AccSaberScoreItem;
};

export function AccSaberBadges({ score }: AccSaberBadgesProps) {
  return (
    <div className="flex h-full w-full flex-col justify-center">
      <div className="grid w-full grid-cols-3 justify-center gap-1">
        <ScoreBadges badges={badges} score={score} leaderboard={score} />
      </div>
    </div>
  );
}
