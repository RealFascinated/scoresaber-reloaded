import { ScoreAccuracyBadge } from "@/components/platform/scoresaber/score/badges/score-accuracy";
import ScoreMissesAndPausesBadge from "@/components/platform/scoresaber/score/badges/score-misses-and-pauses";
import { ScorePpBadge } from "@/components/platform/scoresaber/score/badges/score-pp";
import { ScoreScoreBadge } from "@/components/platform/scoresaber/score/badges/score-score";
import { ScoreBadge, ScoreBadges } from "@/components/score/score-badges";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { getScoreBadgeFromAccuracy } from "@ssr/common/utils/song-utils";
import { timeAgo } from "@ssr/common/utils/time-utils";

type ComparisonScoreBadgesProps = {
  score: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
};

export function ComparisonScoreBadges({ score, leaderboard }: ComparisonScoreBadgesProps) {
  const comparisonBadges: ScoreBadge<ScoreSaberScore, ScoreSaberLeaderboard>[] = [
    ...(leaderboard.ranked
      ? [
          {
            name: "PP",
            color: () => {
              return "bg-statistic";
            },
            create: (score: ScoreSaberScore, leaderboard: ScoreSaberLeaderboard) => {
              if (!score.pp) {
                return undefined;
              }
              return (
                <ScorePpBadge score={score} leaderboard={leaderboard} showDifference={false} />
              );
            },
          },
        ]
      : [
          {
            name: "Score",
            create: (score: ScoreSaberScore) => {
              return <ScoreScoreBadge score={score} />;
            },
          },
        ]),
    {
      name: "Accuracy",
      color: (score: ScoreSaberScore, leaderboard: ScoreSaberLeaderboard) => {
        const acc = (score.score / leaderboard.maxScore) * 100;
        return getScoreBadgeFromAccuracy(acc).color;
      },
      create: (score: ScoreSaberScore) => {
        return <ScoreAccuracyBadge score={score} showDifference={false} />;
      },
    },
    {
      name: "Full Combo",
      create: (score: ScoreSaberScore) => {
        return <ScoreMissesAndPausesBadge score={score} showDifference={false} />;
      },
    },
  ];

  return (
    <div className="flex h-full w-full flex-col justify-center">
      <div className="mb-2 flex w-full items-center justify-center gap-2 text-sm text-gray-300">
        <div className="h-[1px] flex-1 bg-gray-200"></div>
        <span>vs me ({timeAgo(score.timestamp)})</span>
        <div className="h-[1px] flex-1 bg-gray-200"></div>
      </div>
      <div className="grid w-full grid-cols-3 justify-center gap-1">
        <ScoreBadges badges={comparisonBadges} score={score} leaderboard={leaderboard} />
      </div>
    </div>
  );
}
