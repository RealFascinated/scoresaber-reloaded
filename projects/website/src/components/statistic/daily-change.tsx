import { cn } from "@/common/utils";
import SimpleTooltip from "@/components/simple-tooltip";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerStatValue } from "@ssr/common/player/player-stat-change";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import React from "react";

interface DailyChangeProps {
  /**
   * The type of change
   */
  type: PlayerStatValue;

  /**
   * The player to get the change for
   */
  player?: ScoreSaberPlayer | undefined;

  /**
   * The change (if not using player)
   */
  change?: number;

  /**
   * The tooltip to display
   */
  tooltip?: React.ReactElement<any> | string;

  /**
   * The class name
   */
  className?: string;

  /**
   * Whether to use the tooltip
   */
  useTooltip?: boolean;
}

export function DailyChange({
  type,
  player,
  change,
  tooltip,
  className,
  useTooltip = true,
}: DailyChangeProps) {
  const formatValue = type.type == "Performance Points" ? formatPp : formatNumberWithCommas;
  if (!change && player !== undefined) {
    change = type.value?.(player, "daily");
  }
  if (change === 0 || (change && change < 0.01 && change > -0.01) || change === undefined) {
    return null;
  }

  const value = (
    <p className={cn("text-xs", change > 0 ? "text-green-400" : "text-red-400", className)}>
      {change > 0 ? "+" : ""}
      {`${formatValue(change)}${type.type == "Performance Points" ? "pp" : ""}`}
    </p>
  );

  if (!tooltip) {
    tooltip = `${type.type} change compared to yesterday`;
  }

  return useTooltip ? (
    <SimpleTooltip display={tooltip} side="bottom">
      {value}
    </SimpleTooltip>
  ) : (
    value
  );
}
