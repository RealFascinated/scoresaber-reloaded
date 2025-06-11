/* eslint-disable @typescript-eslint/no-explicit-any */

import { env } from "../env";
import { formatNumberWithCommas, formatPp } from "./number-utils";

/**
 * Checks if we're in production
 */
export function isProduction() {
  return env.NEXT_PUBLIC_APP_ENV === "production";
}

/**
 * Checks if we're running on the server
 */
export function isServer() {
  return (
    env.NEXT_PUBLIC_APPLICATION_NAME === "backend" ||
    (!("window" in globalThis) && typeof window == undefined)
  );
}

/**
 * Gets the page from a rank.
 *
 * @param rank the rank
 * @param itemsPerPage the items per page
 * @returns the page number
 */
export function getPageFromRank(rank: number, itemsPerPage: number) {
  return Math.floor((rank - 1) / itemsPerPage) + 1;
}

/**
 * Formats a value change
 *
 * @param change the change to format
 * @param formatValue the function to format the value
 * @param isPp whether the value is a pp number
 */
export function formatChange(
  change: number | undefined,
  formatValue?: (value: number) => string,
  isPp = false
): string | undefined {
  if (change === 0 || change === undefined) {
    return undefined;
  }

  // Default formats
  if (!formatValue) {
    formatValue = formatNumberWithCommas;
    if (isPp) {
      formatValue = formatPp;
    }
  }

  return (change > 0 ? "+" : "") + formatValue(change) + (isPp ? "pp" : "");
}

/**
 * Generates a consistent color based on a string input.
 * Uses HSL color space for better color distribution.
 *
 * @param str the string to generate a color from
 * @returns a color in HSL format
 */
export function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Convert to HSL for better color distribution
  const h = hash % 360;
  return `hsl(${h}, 70%, 60%)`;
}
