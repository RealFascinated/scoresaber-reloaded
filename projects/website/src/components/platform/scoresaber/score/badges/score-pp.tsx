import { Change } from "@/components/change";
import { useRealm } from "@/components/providers/realm-provider";
import SimpleTooltip from "@/components/simple-tooltip";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { ensurePositiveNumber, formatPp } from "@ssr/common/utils/number-utils";

type ScorePpProps = {
  /**
   * Ranked score with PP/weight (medal scores have no PP).
   */
  score: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
  showDifference?: boolean;
};

export function ScorePpBadge({ score, leaderboard, showDifference = true }: ScorePpProps) {
  const { getPp } = useRealm();
  const previousScore = score.previousScore;
  const fcAccuracy = score.beatLeaderScore?.fcAccuracy;
  const { pp, weight } = score;
  if (pp === 0) {
    return undefined;
  }
  const weightedPp = weight ? pp * weight : undefined;
  const fcPp = !score.fullCombo && fcAccuracy ? getPp(leaderboard.stars, fcAccuracy).toFixed(0) : undefined;

  return (
    <>
      <div className="flex cursor-default flex-col items-center justify-center">
        <SimpleTooltip
          display={
            <div className="flex flex-col gap-2">
              <div>
                <p className="font-semibold">Performance Points</p>
                <p>Raw: {formatPp(pp)}pp</p>
                {weight && weightedPp && (
                  <p>
                    Weighted: {formatPp(weightedPp)}pp ({(100 * weight).toFixed(2)}%)
                  </p>
                )}
                {fcPp && <p>Full Combo: {fcPp}pp</p>}
              </div>
            </div>
          }
          showOnMobile
        >
          <p>{formatPp(pp)}pp</p>
        </SimpleTooltip>
        {previousScore &&
          previousScore.change &&
          previousScore.pp &&
          previousScore.change.pp &&
          previousScore.change.pp !== score.pp &&
          showDifference && (
            <SimpleTooltip display={<p>Previous PP: {formatPp(previousScore.pp)}pp</p>}>
              <Change
                className="text-xs"
                change={ensurePositiveNumber(previousScore.change.pp)}
                isPp
                showColors
              />
            </SimpleTooltip>
          )}
      </div>
    </>
  );
}
