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

/**
 * Darkens a hex color by reducing each RGB component.
 *
 * @param hex the hex color string (e.g., "#5c6bff")
 * @param amount the amount to darken each RGB component (0-255)
 * @returns the darkened hex color string
 */
export function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, ((num >> 16) & 0xff) - amount);
  const g = Math.max(0, ((num >> 8) & 0xff) - amount);
  const b = Math.max(0, (num & 0xff) - amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/**
 * Gets a query params string from an object.
 *
 * @param params the object to get the query params from
 * @returns the query params string
 */
export function getQueryParamsFromObject(params: Record<string, string>) {
  // Filter out undefined values and empty strings from the query params
  const filteredQueryParams = Object.fromEntries(
    Object.entries(params || {}).filter(([, value]) => value !== undefined && value !== "")
  );
  return filteredQueryParams && Object.keys(filteredQueryParams).length > 0
    ? `?${new URLSearchParams(params)}`
    : "";
}

/**
 * Converts a MongoDB ObjectId or similar object to a string or number.
 * Handles ObjectId instances by converting them to strings, and converts to number if the string is numeric.
 *
 * @param id the id to convert (can be ObjectId, string, number, or undefined)
 * @returns the converted id as a string or number, or undefined if id is undefined
 */
export function convertObjectId(id: unknown): string | number | undefined {
  if (id === undefined || id === null) {
    return undefined;
  }
  if (typeof id === "string" || typeof id === "number") {
    return id;
  }
  if (typeof id === "object" && "toString" in id) {
    const idObj = id as { toString(): string };
    const idStr = idObj.toString();
    // Try to convert to number if it's numeric, otherwise use string
    return /^\d+$/.test(idStr) ? Number(idStr) : idStr;
  }
  return String(id);
}
