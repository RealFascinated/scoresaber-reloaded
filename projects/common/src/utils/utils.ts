/**
 * Checks if we're in production
 */
export function isProduction() {
  return process.env.NODE_ENV === "production";
}
