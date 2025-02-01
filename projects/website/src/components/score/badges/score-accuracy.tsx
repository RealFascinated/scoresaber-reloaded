import { getAccDetails, getScoreBadgeFromAccuracy } from "@ssr/common/utils/song-utils";
import { Modifier } from "@ssr/common/score/modifier";
import Tooltip from "@/components/tooltip";
import { ScoreModifiers } from "@/components/score/score-modifiers";
import { Change } from "@/components/change";
import { ScoreBadgeProps } from "@/components/score/badges/badge-props";
import { formatScoreAccuracy } from "@ssr/common/utils/score.util";

export function ScoreAccuracyBadge({ score }: ScoreBadgeProps) {
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
        <Tooltip
          display={
            <div className="flex flex-col gap-2">
              <div>
                <p className="font-semibold">Accuracy</p>
                <p>Score: {getAccDetails(scoreBadge)}</p>
                <p>Accuracy: {formatScoreAccuracy(score)}</p>
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
          <Tooltip
            className="flex gap-2 text-xs items-center"
            display={
              <div className="flex flex-col gap-2">
                <div>
                  <p className="font-semibold">Previous Accuracy</p>
                  <p>Score: {getAccDetails(scoreBadge)}</p>
                  {score.previousScore && <p>Accuracy: {formatScoreAccuracy(score.previousScore)}</p>}
                  {!score.fullCombo && fcAccuracy && <p>Full Combo: {fcAccuracy.toFixed(2)}%</p>}
                </div>

                {previousModCount > 0 && score.previousScore && (
                  <div>
                    <p className="font-semibold">Previous Modifiers</p>
                    <ScoreModifiers type="full" score={score.previousScore} />
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
              <ScoreModifiers type="simple" limit={1} score={score.previousScore} />
            )}
          </Tooltip>
        )}
      </div>
    </>
  );
}
