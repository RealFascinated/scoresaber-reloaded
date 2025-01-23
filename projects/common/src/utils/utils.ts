import ky from "ky";
import {formatNumberWithCommas, formatPp} from "./number-utils";
import {KyOptions} from "ky/distribution/types/options";

/**
 * Checks if we're in production
 */
export function isProduction() {
  return process.env.NODE_ENV === "production";
}

/**
 * Checks if we're running on the server
 */
export function isServer() {
  return typeof window === "undefined";
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
 * Fetches data from the given url.
 *
 * @param url the url to fetch
 * @param options the ky options to use
 */
export async function kyFetchJson<T>(url: string, options?: KyOptions): Promise<T | undefined> {
  try {
    return await ky.get<T>(url, options).json();
  } catch (error) {
    return undefined;
  }
}

/**
 * Posts data top the given url.
 *
 * @param url the url to post to
 * @param options the ky options to use
 */
export async function kyPostJson<T>(url: string, options?: KyOptions): Promise<T | undefined> {
  try {
    return await ky.post<T>(url, options).json();
  } catch (error) {
    return undefined;
  }
}

/**
 * Fetches data from the given url.
 *
 * @param url the url to fetch
 * @param options the ky options to use
 */
export async function kyFetchText(url: string, options?: KyOptions): Promise<string | undefined> {
  try {
    return await ky.get<string>(url, options).text();
  } catch (error) {
    return undefined;
  }
}

/**
 * Fetches data from the given url.
 *
 * @param url the url to fetch
 */
export async function kyFetchBuffer(url: string): Promise<ArrayBuffer | undefined> {
  try {
    return await ky.get(url).arrayBuffer();
  } catch (error) {
    return undefined;
  }
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
