import { cn } from "@/common/utils";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { ArrowDownRightIcon, ArrowUpRightIcon } from "lucide-react";
import SimpleTooltip from "../simple-tooltip";

type WeeklyRankChangeProps = {
  weeklyRankChange: number;
  className?: string;
  showTooltip?: boolean;
};

export function WeeklyRankChange({ weeklyRankChange, className, showTooltip = false }: WeeklyRankChangeProps) {
  const content = (
    <div className={cn("flex items-center", className)}>
      {weeklyRankChange > 0 && <ArrowUpRightIcon className="h-4 w-4 text-green-500" />}
      {weeklyRankChange < 0 && <ArrowDownRightIcon className="h-4 w-4 text-red-500" />}
      {weeklyRankChange !== 0 && (
        <span className={cn("ml-1 text-xs font-semibold", weeklyRankChange > 0 ? "text-green-500" : "text-red-500")}>
          {formatNumberWithCommas(Math.abs(weeklyRankChange))}
        </span>
      )}
    </div>
  );

  if (showTooltip) {
    return (
      <SimpleTooltip display={<p>Weekly Rank Change</p>}>
        {weeklyRankChange >= -999 && weeklyRankChange <= 999 && content}
      </SimpleTooltip>
    );
  }

  return content;
}
