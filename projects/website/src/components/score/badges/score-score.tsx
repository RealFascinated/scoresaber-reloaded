import { ScoreBadgeProps } from "@/components/score/badges/badge-props";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { Change } from "@/common/change";

export function ScoreScoreBadge({ score }: ScoreBadgeProps) {
  const scoreImprovement = score.additionalData?.scoreImprovement;

  return (
    <div className="flex flex-col items-center justify-center">
      <p>{formatNumberWithCommas(Number(score.score.toFixed(0)))}</p>
      {scoreImprovement && <Change className="text-xs" change={scoreImprovement.score} />}
    </div>
  );
}
