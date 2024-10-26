import { ScoreBadgeProps } from "@/components/score/badges/badge-props";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import Tooltip from "@/components/tooltip";
import { ensurePositiveNumber, formatPp } from "@ssr/common/utils/number-utils";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { Change } from "@/common/change";

type ScorePpProps = ScoreBadgeProps & {
  /**
   * The leaderboard the score was set on.
   */
  leaderboard: ScoreSaberLeaderboard;
};

export function ScorePpBadge({ score, leaderboard }: ScorePpProps) {
  const previousScore = score.previousScore;
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
      <div className="flex flex-col items-center justify-center cursor-default">
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
            </div>
          }
        >
          <p>{formatPp(pp)}pp</p>
        </Tooltip>
        {previousScore && previousScore.change && (
          <Tooltip display={<p>Previous PP: {formatPp(previousScore.pp)}pp</p>}>
            <Change className="text-xs" change={ensurePositiveNumber(previousScore.change.pp)} isPp />
          </Tooltip>
        )}
      </div>
    </>
  );
}
