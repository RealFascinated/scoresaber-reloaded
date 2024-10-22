import React from "react";
import Tooltip from "@/components/tooltip";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { PlayerStatValue } from "@ssr/common/player/player-stat";

interface DailyChangeProps {
  /**
   * The type of change
   */
  type: PlayerStatValue;

  /**
   * The value of the change
   */
  change: number | undefined;

  /**
   * The tooltip to display
   */
  tooltip?: React.ReactElement | string;

  /**
   * The formater for the change
   *
   * @param value
   */
  format?: (value: number) => string;
}

export function DailyChange({ type, change, tooltip, format }: DailyChangeProps) {
  const formatValue = format ?? formatNumberWithCommas;
  if (change === 0 || change === undefined) {
    return null;
  }

  const value = (
    <p className={`text-sm ${change > 0 ? "text-green-400" : "text-red-400"}`}>
      {change > 0 ? "+" : ""}
      {`${formatValue(change)}${type.value == "pp" ? "pp" : ""}`}
    </p>
  );

  if (!tooltip) {
    tooltip = `${type.displayName} change compared to yesterday`;
  }

  return (
    <Tooltip display={tooltip} side="bottom">
      {value}
    </Tooltip>
  );
}
