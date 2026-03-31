"use client";

import { HandAccuracyBadge } from "@/components/platform/scoresaber/score/badges/hand-accuracy";
import { ScoreBadge, ScoreBadges } from "@/components/score/score-badges";
import { AccSaberScore } from "@ssr/common/schemas/accsaber/tokens/score/score";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { getScoreBadgeFromAccuracy } from "@ssr/common/utils/song-utils";

export const badges: ScoreBadge<AccSaberScore, AccSaberScore["leaderboard"]>[] = [
  {
    name: "AP",
    color: () => "bg-statistic",
    create: (score: AccSaberScore) => {
      return (
        <div className="flex cursor-default flex-col items-center justify-center">
          <p>{score.ap.toFixed(2)} AP</p>
        </div>
      );
    },
  },
  {
    name: "Accuracy",
    color: (score: AccSaberScore) => {
      return getScoreBadgeFromAccuracy(score.acc).color;
    },
    create: (score: AccSaberScore) => {
      return (
        <div className="flex cursor-default flex-col items-center justify-center">
          <p>{score.acc.toFixed(2)}%</p>
        </div>
      );
    },
  },
  {
    name: "Score",
    create: (scoreResponse: AccSaberScore) => {
      return (
        <div className="flex flex-col items-center justify-center">
          <p>{formatNumberWithCommas(scoreResponse.score.score)}</p>
        </div>
      );
    },
  },
  {
    name: "Left Hand Accuracy",
    color: () => "bg-hands-left",
    create: (score: AccSaberScore) => {
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
    create: (score: AccSaberScore) => {
      const beatLeaderScore = score.beatLeaderScore;
      if (!beatLeaderScore) {
        return undefined;
      }
      return <HandAccuracyBadge beatLeaderScore={beatLeaderScore} hand="right" />;
    },
  },
];

type AccSaberBadgesProps = {
  score: AccSaberScore;
};

export function AccSaberBadges({ score }: AccSaberBadgesProps) {
  return (
    <div className="flex h-full w-full flex-col justify-center">
      <div className="grid w-full grid-cols-3 justify-center gap-1">
        <ScoreBadges badges={badges} score={score} leaderboard={score.leaderboard} />
      </div>
    </div>
  );
}
