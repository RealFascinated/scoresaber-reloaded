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
 * Delays a promise
 *
 * @param ms the number of milliseconds to delay
 */
export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
