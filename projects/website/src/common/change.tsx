import React from "react";

/**
 * Renders the change for a stat.
 *
 * @param change the change
 * @param isPp whether the stat is pp
 * @param formatValue the function to format the value
 */
export function renderChange(change: number | undefined, isPp: boolean, formatValue: (value: number) => string) {
  if (change === 0 || (change && change > 0 && change < 0.01) || change === undefined) {
    return null;
  }

  return (
    <p className={`text-sm ${change > 0 ? "text-green-400" : "text-red-400"}`}>
      {change > 0 ? "+" : ""}
      {`${formatValue(change)}${isPp ? "pp" : ""}`}
    </p>
  );
}
