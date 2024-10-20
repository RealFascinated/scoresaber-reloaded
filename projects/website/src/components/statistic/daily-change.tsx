import React from "react";
import Tooltip from "@/components/tooltip";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { PlayerStatValue } from "@ssr/common/player/player-stat";

// Props for DailyChangeComponent
interface DailyChangeProps {
  type: PlayerStatValue;
  change: number | undefined;
  tooltip?: React.ReactElement | string;
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
      {formatValue(change)}
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
