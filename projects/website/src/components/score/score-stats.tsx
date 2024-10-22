import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { getScoreBadgeFromAccuracy } from "@/common/song-utils";
import Tooltip from "@/components/tooltip";
import { ScoreBadge, ScoreBadges } from "@/components/score/score-badge";
import ScoreSaberScore from "@ssr/common/score/impl/scoresaber-score";
import ScoreSaberLeaderboard from "@ssr/common/leaderboard/impl/scoresaber-leaderboard";
import ScoreMissesBadge from "@/components/score/badges/score-misses";
import { Modifier } from "@ssr/common/score/modifier";
import { ScoreModifiers } from "@/components/score/score-modifiers";
import { renderChange } from "@/common/change";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";

const badges: ScoreBadge[] = [
  {
    name: "PP",
    color: () => {
      return "bg-pp";
    },
    create: (score: ScoreSaberScore, leaderboard: ScoreSaberLeaderboard) => {
      const fcAccuracy = score.additionalData?.fcAccuracy;
      const pp = score.pp;
      const weight = score.weight;
      if (pp === 0 || pp === undefined || weight === undefined) {
        return undefined;
      }
      const weightedPp = pp * weight;

      return (
        <>
          <Tooltip
            display={
              <div>
                <p className="font-semibold">Performance Points</p>
                <p>Raw: {formatPp(pp)}pp</p>
                <p>
                  Weighted: {formatPp(weightedPp)}pp ({(100 * weight).toFixed(2)}%)
                </p>
                {fcAccuracy && <p>Full Combo: {scoresaberService.getPp(leaderboard.stars, fcAccuracy).toFixed(0)}pp</p>}
              </div>
            }
          >
            <p>{formatPp(pp)}pp</p>
          </Tooltip>
        </>
      );
    },
  },
  {
    name: "Accuracy",
    color: (score: ScoreSaberScore, leaderboard: ScoreSaberLeaderboard) => {
      const acc = (score.score / leaderboard.maxScore) * 100;
      return getScoreBadgeFromAccuracy(acc).color;
    },
    create: (score: ScoreSaberScore, leaderboard: ScoreSaberLeaderboard) => {
      const scoreImprovement = score.additionalData?.scoreImprovement;

      const acc = (score.score / leaderboard.maxScore) * 100;
      const fcAccuracy = score.additionalData?.fcAccuracy;
      const scoreBadge = getScoreBadgeFromAccuracy(acc);
      let accDetails = `${scoreBadge.name != "-" ? scoreBadge.name : ""}`;
      if (scoreBadge.max == null) {
        accDetails += ` (> ${scoreBadge.min}%)`;
      } else if (scoreBadge.min == null) {
        accDetails += ` (< ${scoreBadge.max}%)`;
      } else {
        accDetails += ` (${scoreBadge.min}% - ${scoreBadge.max}%)`;
      }

      const failed = score.modifiers.includes("No Fail" as Modifier);
      const modCount = score.modifiers.length;
      return (
        <>
          <Tooltip
            display={
              <div className="flex flex-col gap-2">
                <div>
                  <p className="font-semibold">Accuracy</p>
                  <p>Score: {accDetails}</p>
                  {fcAccuracy && <p>Full Combo: {fcAccuracy.toFixed(2)}%</p>}
                </div>

                {modCount > 0 && (
                  <div>
                    <p className="font-semibold">Modifiers</p>
                    <ScoreModifiers type="full" score={score} />
                  </div>
                )}
                {failed && <p className="text-red-500">Failed</p>}
              </div>
            }
          >
            <div className="flex flex-col items-center justify-center cursor-default">
              <p>
                {acc.toFixed(2)}% {modCount > 0 && <ScoreModifiers type="simple" limit={1} score={score} />}
              </p>
              {scoreImprovement &&
                renderChange(scoreImprovement.accuracy, false, num => {
                  return `${num.toFixed(2)}%`;
                })}
            </div>
          </Tooltip>
        </>
      );
    },
  },
  {
    name: "Score",
    create: (score: ScoreSaberScore) => {
      const scoreImprovement = score.additionalData?.scoreImprovement;

      return (
        <div className="flex flex-col items-center justify-center">
          <p>{formatNumberWithCommas(Number(score.score.toFixed(0)))}</p>
          {scoreImprovement && renderChange(scoreImprovement.score, false, formatNumberWithCommas)}
        </div>
      );
    },
  },
  {
    name: "Left Hand Accuracy",
    color: () => "bg-hands-left",
    create: (score: ScoreSaberScore) => {
      if (!score.additionalData) {
        return undefined;
      }
      const { handAccuracy } = score.additionalData;
      const scoreImprovement = score.additionalData.scoreImprovement;

      return (
        <Tooltip display={"Left Hand Accuracy"}>
          <div className="flex flex-col items-center justify-center">
            <p>{handAccuracy.left.toFixed(2)}</p>
            {scoreImprovement && renderChange(scoreImprovement.handAccuracy.left, false, num => num.toFixed(2))}
          </div>
        </Tooltip>
      );
    },
  },
  {
    name: "Right Hand Accuracy",
    color: () => "bg-hands-right",
    create: (score: ScoreSaberScore) => {
      if (!score.additionalData) {
        return undefined;
      }

      const { handAccuracy } = score.additionalData;
      const scoreImprovement = score.additionalData.scoreImprovement;
      return (
        <Tooltip display={"Right Hand Accuracy"}>
          <div className="flex flex-col items-center justify-center">
            <p>{handAccuracy.right.toFixed(2)}</p>
            {scoreImprovement && renderChange(scoreImprovement.handAccuracy.right, false, num => num.toFixed(2))}
          </div>
        </Tooltip>
      );
    },
  },
  {
    name: "Full Combo",
    create: (score: ScoreSaberScore) => {
      return <ScoreMissesBadge score={score} />;
    },
  },
];

type Props = {
  score: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
};

export default function ScoreStats({ score, leaderboard }: Props) {
  return (
    <div className={`grid grid-cols-3 grid-rows-2 gap-1 ml-0 lg:ml-2 `}>
      <ScoreBadges badges={badges} score={score} leaderboard={leaderboard} />
    </div>
  );
}
