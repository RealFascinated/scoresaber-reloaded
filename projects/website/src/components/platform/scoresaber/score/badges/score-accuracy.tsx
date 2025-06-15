import { Change } from "@/components/change";
import { ScoreBadgeProps } from "@/components/platform/scoresaber/score/badges/badge-props";
import { ScoreSaberScoreModifiers } from "@/components/platform/scoresaber/score/score-modifiers";
import SimpleTooltip from "@/components/simple-tooltip";
import { Modifier } from "@ssr/common/score/modifier";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { formatScoreAccuracy } from "@ssr/common/utils/score.util";
import { getAccDetails, getScoreBadgeFromAccuracy } from "@ssr/common/utils/song-utils";

type ScoreAccuracyBadgeProps = ScoreBadgeProps & {
  /**
   * Whether to show the difference between the score and the previous score.
   */
  showDifference?: boolean;
};

export function ScoreAccuracyBadge({ score, showDifference = true }: ScoreAccuracyBadgeProps) {
  const previousScore = score.previousScore;

  const fcAccuracy = score.additionalData?.fcAccuracy;
  const scoreBadge = getScoreBadgeFromAccuracy(score.accuracy);

  const failed = score.modifiers.includes("No Fail" as Modifier);
  const modCount = score.modifiers.length;

  const previousScoreFailed = previousScore?.modifiers?.includes("No Fail" as Modifier);
  const previousModCount = previousScore?.modifiers?.length ?? 0;

  return (
    <>
      <div className="flex flex-col items-center justify-center cursor-default">
        <SimpleTooltip
          display={
            <div className="flex flex-col gap-2">
              <div>
                <p className="font-semibold">Accuracy</p>
                <p>Score: {getAccDetails(scoreBadge)}</p>
                <p>
                  Accuracy: {formatScoreAccuracy(score.accuracy)}
                  {!score.fullCombo && fcAccuracy && (
                    <span className="text-green-500">
                      {" "}
                      (FC: {formatScoreAccuracy(fcAccuracy)}%)
                    </span>
                  )}
                </p>
                <p>Max Combo: {formatNumberWithCommas(score.maxCombo)}x</p>
              </div>

              {modCount > 0 && (
                <div>
                  <p className="font-semibold">Modifiers</p>
                  <ScoreSaberScoreModifiers type="full" score={score} />
                </div>
              )}
              {failed && <p className="text-red-500">Failed</p>}
            </div>
          }
          showOnMobile
        >
          <p>
            {formatScoreAccuracy(score.accuracy)}{" "}
            {modCount > 0 && <ScoreSaberScoreModifiers type="simple" limit={1} score={score} />}
          </p>
        </SimpleTooltip>
        {previousScore && previousScore.accuracy && previousScore.change && showDifference && (
          <SimpleTooltip
            className="flex gap-2 text-xs items-center"
            display={
              <div className="flex flex-col gap-2">
                <div>
                  <p className="font-semibold">Previous Accuracy</p>
                  <p>Score: {getAccDetails(scoreBadge)}</p>
                  {score.previousScore && (
                    <p>Accuracy: {formatScoreAccuracy(score.previousScore.accuracy)}</p>
                  )}
                  {!score.fullCombo && fcAccuracy && (
                    <p>Full Combo: {formatScoreAccuracy(fcAccuracy)}</p>
                  )}
                </div>

                {previousModCount > 0 && score.previousScore && (
                  <div>
                    <p className="font-semibold">Previous Modifiers</p>
                    <ScoreSaberScoreModifiers type="full" score={score.previousScore} />
                  </div>
                )}
                {previousScoreFailed && <p className="text-red-500">Failed</p>}
              </div>
            }
          >
            <Change
              className="text-xs"
              change={previousScore.change.accuracy}
              formatValue={num => `${num.toFixed(2)}%`}
            />
            {previousModCount > 0 && score.previousScore && (
              <ScoreSaberScoreModifiers type="simple" limit={1} score={score.previousScore} />
            )}
          </SimpleTooltip>
        )}
      </div>
    </>
  );
}
