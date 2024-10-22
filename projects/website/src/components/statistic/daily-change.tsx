import React from "react";
import Tooltip from "@/components/tooltip";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerStatValue } from "@ssr/common/player/player-stat-change";

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
  tooltip?: React.ReactElement | string;
}

export function DailyChange({ type, player, change, tooltip }: DailyChangeProps) {
  const formatValue = type.type == "Performance Points" ? formatPp : formatNumberWithCommas;
  if (!change && player !== undefined) {
    change = type.value?.(player, "daily");
  }
  if (change === 0 || (change && change < 0.01) || change === undefined) {
    return null;
  }

  const value = (
    <p className={`text-sm ${change > 0 ? "text-green-400" : "text-red-400"}`}>
      {change > 0 ? "+" : ""}
      {`${formatValue(change)}${type.type == "Performance Points" ? "pp" : ""}`}
    </p>
  );

  if (!tooltip) {
    tooltip = `${type.type} change compared to yesterday`;
  }

  return (
    <Tooltip display={tooltip} side="bottom">
      {value}
    </Tooltip>
  );
}
