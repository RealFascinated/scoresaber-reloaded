import { Change } from "@/components/change";
import { ScoreBadgeProps } from "@/components/platform/scoresaber/score/badges/badge-props";
import SimpleTooltip from "@/components/simple-tooltip";
import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ensurePositiveNumber, formatPp } from "@ssr/common/utils/number-utils";

type ScorePpProps = ScoreBadgeProps & {
  /**
   * The leaderboard the score was set on.
   */
  leaderboard: ScoreSaberLeaderboard;

  /**
   * Whether to show the difference between the score and the previous score.
   */
  showDifference?: boolean;
};

export function ScorePpBadge({ score, leaderboard, showDifference = true }: ScorePpProps) {
  const previousScore = score.previousScore;
  const fcAccuracy = score.additionalData?.fcAccuracy;
  const pp = score.pp;
  const weight = score.weight;
  if (pp === 0 || pp === undefined || weight === undefined) {
    return undefined;
  }
  const weightedPp = pp * weight;
  const fcPp =
    !score.fullCombo && fcAccuracy
      ? ApiServiceRegistry.getInstance()
          .getScoreSaberService()
          .getPp(leaderboard.stars, fcAccuracy)
          .toFixed(0)
      : undefined;

  return (
    <>
      <div className="flex flex-col items-center justify-center cursor-default">
        <SimpleTooltip
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
        </SimpleTooltip>
        {previousScore &&
          previousScore.change &&
          previousScore.pp !== score.pp &&
          showDifference && (
            <SimpleTooltip display={<p>Previous PP: {formatPp(previousScore.pp)}pp</p>}>
              <Change
                className="text-xs"
                change={ensurePositiveNumber(previousScore.change.pp)}
                isPp
              />
            </SimpleTooltip>
          )}
      </div>
    </>
  );
}
