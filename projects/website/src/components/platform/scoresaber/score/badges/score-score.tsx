import { Change } from "@/components/change";
import { ScoreBadgeProps } from "@/components/platform/scoresaber/score/badges/badge-props";
import SimpleTooltip from "@/components/simple-tooltip";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";

export function ScoreScoreBadge({ score }: ScoreBadgeProps) {
  const previousScore = score.previousScore;

  return (
    <div className="flex flex-col items-center justify-center">
      <SimpleTooltip display={`Max Combo: ${formatNumberWithCommas(Number(score.maxCombo.toFixed(0)))}x`}>
        <p>{formatNumberWithCommas(Number(score.score.toFixed(0)))}</p>
      </SimpleTooltip>
      {previousScore && previousScore.change && (
        <SimpleTooltip display={<p>Previous Score: {formatNumberWithCommas(previousScore.score)}</p>} showOnMobile>
          <Change className="text-xs" change={previousScore.change.score} />
        </SimpleTooltip>
      )}
    </div>
  );
}
