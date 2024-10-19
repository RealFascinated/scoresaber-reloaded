import ky from "ky";

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
 */
export async function kyFetch<T>(url: string): Promise<T | undefined> {
  try {
    return await ky.get<T>(url).json();
  } catch (error) {
    console.error(`Error fetching data from ${url}:`, error);
    return undefined;
  }
}
