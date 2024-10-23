import React from "react";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";

type ChangeProps = {
  /**
   * The amount the value changed
   */
  change: number | undefined;

  /**
   * The function to format the value
   * @param value
   */
  formatValue?: (value: number) => string;

  /**
   * Whether the number is a pp number
   */
  isPp?: boolean;

  /**
   * Should we use colors?
   */
  showColors?: boolean;
};

export function Change({ change, formatValue, isPp, showColors }: ChangeProps) {
  if (change === 0 || (change && change > 0 && change < 0.01) || change === undefined) {
    return null;
  }

  // Default formats
  if (!formatValue) {
    formatValue = formatNumberWithCommas;
    if (isPp) {
      formatValue = formatPp;
    }
  }

  return (
    <p className={`text-sm ${showColors && (change > 0 ? "text-green-400" : "text-red-400")}`}>
      {change > 0 ? "+" : ""}
      {`${formatValue(change)}${isPp ? "pp" : ""}`}
    </p>
  );
}
