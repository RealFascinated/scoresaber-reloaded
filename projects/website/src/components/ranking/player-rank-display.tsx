import { getRankColor } from "@/common/rank-color-utils";
import { cn } from "@/common/utils";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";

type PlayerRankDisplayProps = {
  rank: number;
  className?: string;
};

export function PlayerRankDisplay({ rank, className }: PlayerRankDisplayProps) {
  return (
    <div className={cn("flex flex-col items-center", className)}>
      <span className={cn("text-base", getRankColor(rank))}>#{formatNumberWithCommas(rank)}</span>
    </div>
  );
}
