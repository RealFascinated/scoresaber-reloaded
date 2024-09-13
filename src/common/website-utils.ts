/**
 * Sets the player id cookie
 *
 * @param playerId the player id to set
 */
export function setPlayerIdCookie(playerId: string) {
  document.cookie = `playerId=${playerId}`;
}

/**
 * Gets if we're in production
 */
export function isProduction() {
  return process.env.NODE_ENV === "production";
}

/**
 * Gets the build information
 *
 * @returns the build information
 */
export function getBuildInformation() {
  const buildId = process.env.NEXT_PUBLIC_BUILD_ID
    ? isProduction()
      ? process.env.NEXT_PUBLIC_BUILD_ID.slice(0, 7)
      : "dev"
    : "";
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME;

  return { buildId, buildTime };
}
