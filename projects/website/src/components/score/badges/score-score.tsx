import { Change } from "@/components/change";
import { ScoreBadgeProps } from "@/components/score/badges/badge-props";
import Tooltip from "@/components/tooltip";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";

export function ScoreScoreBadge({ score }: ScoreBadgeProps) {
  const previousScore = score.previousScore;

  return (
    <div className="flex flex-col items-center justify-center">
      <p>{formatNumberWithCommas(Number(score.score.toFixed(0)))}</p>
      {previousScore && previousScore.change && (
        <Tooltip display={<p>Previous Score: {formatNumberWithCommas(previousScore.score)}</p>}>
          <Change className="text-xs" change={previousScore.change.score} />
        </Tooltip>
      )}
    </div>
  );
}
