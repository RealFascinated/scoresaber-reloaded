import { env } from "../env";
import { formatNumberWithCommas, formatPp } from "./number-utils";

export function isProduction() {
  return env.NEXT_PUBLIC_APP_ENV === "production";
}

export function isServer() {
  return (
    env.NEXT_PUBLIC_APPLICATION_NAME === "backend" ||
    (!("window" in globalThis) && typeof window == undefined)
  );
}

export function getPageFromRank(rank: number, itemsPerPage: number) {
  return Math.floor((rank - 1) / itemsPerPage) + 1;
}

export function formatChange(
  change: number | undefined,
  formatValue?: (value: number) => string,
  isPp = false
): string | undefined {
  if (change === 0 || change === undefined) {
    return undefined;
  }

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
 */
export function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const h = hash % 360;
  return `hsl(${h}, 70%, 60%)`;
}

/**
 * Darkens a hex color by reducing each RGB component.
 *
 * @param hex the hex color string (e.g., "#5c6bff")
 * @param amount the amount to darken each RGB component (0-255)
 */
export function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, ((num >> 16) & 0xff) - amount);
  const g = Math.max(0, ((num >> 8) & 0xff) - amount);
  const b = Math.max(0, (num & 0xff) - amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export function getQueryParamsFromObject(params: Record<string, string>) {
  const filteredQueryParams = Object.fromEntries(
    Object.entries(params || {}).filter(([, value]) => value !== undefined && value !== "")
  );
  return filteredQueryParams && Object.keys(filteredQueryParams).length > 0
    ? `?${new URLSearchParams(params)}`
    : "";
}

export function chunkArray<T>(array: T[], size: number): T[][] {
  return array.reduce((result, item, index) => {
    const chunkIndex = Math.floor(index / size);
    if (!result[chunkIndex]) {
      result[chunkIndex] = [];
    }
    result[chunkIndex].push(item);
    return result;
  }, [] as T[][]);
}
