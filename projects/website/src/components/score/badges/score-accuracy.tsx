import { getScoreBadgeFromAccuracy } from "@/common/song-utils";
import { Modifier } from "@ssr/common/score/modifier";
import Tooltip from "@/components/tooltip";
import { ScoreModifiers } from "@/components/score/score-modifiers";
import { Change } from "@/common/change";
import { ScoreBadgeProps } from "@/components/score/badges/badge-props";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { formatScoreAccuracy } from "@ssr/common/utils/score.util";

type ScoreAccuracyProps = ScoreBadgeProps & {
  /**
   * The leaderboard the score was set on.
   */
  leaderboard: ScoreSaberLeaderboard;
};

export function ScoreAccuracyBadge({ score, leaderboard }: ScoreAccuracyProps) {
  const previousScore = score.previousScore;

  const fcAccuracy = score.additionalData?.fcAccuracy;
  const scoreBadge = getScoreBadgeFromAccuracy(score.accuracy);
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
      <div className="flex flex-col items-center justify-center cursor-default">
        <Tooltip
          display={
            <div className="flex flex-col gap-2">
              <div>
                <p className="font-semibold">Accuracy</p>
                <p>Score: {accDetails}</p>
                {!score.fullCombo && fcAccuracy && <p>Full Combo: {fcAccuracy.toFixed(2)}%</p>}
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
          <p>
            {formatScoreAccuracy(score)} {modCount > 0 && <ScoreModifiers type="simple" limit={1} score={score} />}
          </p>
        </Tooltip>
        {previousScore && previousScore.accuracy && previousScore.change && (
          <Tooltip display={`Previous Accuracy: ${previousScore.accuracy.toFixed(2)}%`}>
            <Change
              className="text-xs"
              change={previousScore.change.accuracy}
              formatValue={num => `${num.toFixed(2)}%`}
            />
          </Tooltip>
        )}
      </div>
    </>
  );
}
