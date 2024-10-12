/**
 * Checks if we're in production
 */
export function isProduction() {
  return process.env.NODE_ENV === "production";
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
 * @returns the page
 */
export function getPageFromRank(rank: number, itemsPerPage: number) {
  return Math.floor(rank / itemsPerPage) + 1;
}
