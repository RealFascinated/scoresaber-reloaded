import { ScoreBadgeProps } from "@/components/score/badges/badge-props";
import ScoreSaberLeaderboard from "@ssr/common/leaderboard/impl/scoresaber-leaderboard";
import Tooltip from "@/components/tooltip";
import { formatPp } from "@ssr/common/utils/number-utils";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { Change } from "@/common/change";

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
  const previousPp = fcAccuracy ? scoresaberService.getPp(leaderboard.stars, fcAccuracy).toFixed(0) : undefined;
  const isSamePp = previousPp === pp.toFixed(0);

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
            {previousPp && !isSamePp && <p>Full Combo: {previousPp}pp</p>}
          </div>
        }
      >
        <div className="flex flex-col items-center justify-center cursor-default">
          <p>{formatPp(pp)}pp</p>
          {previousAccuracy && <Change change={previousAccuracy} isPp />}
        </div>
      </Tooltip>
    </>
  );
}
