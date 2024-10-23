import { ScoreBadgeProps } from "@/components/score/badges/badge-props";
import ScoreSaberLeaderboard from "@ssr/common/leaderboard/impl/scoresaber-leaderboard";
import Tooltip from "@/components/tooltip";
import { ensurePositiveNumber, formatPp } from "@ssr/common/utils/number-utils";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { Change } from "@/common/change";
import { Warning } from "@/components/warning";

type ScorePpProps = ScoreBadgeProps & {
  /**
   * The leaderboard the score was set on.
   */
  leaderboard: ScoreSaberLeaderboard;
};

export function ScorePpBadge({ score, leaderboard }: ScorePpProps) {
  const scoreImprovement = score.additionalData?.scoreImprovement;
  const previousAccuracy = scoreImprovement ? score.accuracy - scoreImprovement?.accuracy : undefined;
  const fcAccuracy = score.additionalData?.fcAccuracy;
  const pp = score.pp;
  const weight = score.weight;
  if (pp === 0 || pp === undefined || weight === undefined) {
    return undefined;
  }
  const weightedPp = pp * weight;
  const fcPp =
    !score.fullCombo && fcAccuracy ? scoresaberService.getPp(leaderboard.stars, fcAccuracy).toFixed(0) : undefined;

  return (
    <>
      <Tooltip
        display={
          <div className="flex flex-col gap-2">
            <div>
              <p className="font-semibold">Performance Points</p>
              <p>Raw: {formatPp(pp)}pp</p>
              <p>
                Weighted: {formatPp(weightedPp)}pp ({(100 * weight).toFixed(2)}%)
              </p>
              {fcPp && <p>Full Combo: {fcPp}pp</p>}
            </div>

            {previousAccuracy && (
              <Warning>
                <p className="text-red-700">
                  The previous pp may not be 100% accurate due to ScoreSaber API limitations.
                </p>
              </Warning>
            )}
          </div>
        }
      >
        <div className="flex flex-col items-center justify-center cursor-default">
          <p>{formatPp(pp)}pp</p>
          {previousAccuracy && (
            <Change
              className="text-xs"
              change={ensurePositiveNumber(pp - scoresaberService.getPp(leaderboard.stars, previousAccuracy))}
              isPp
            />
          )}
        </div>
      </Tooltip>
    </>
  );
}
