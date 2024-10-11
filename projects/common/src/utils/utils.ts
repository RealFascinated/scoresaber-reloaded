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
