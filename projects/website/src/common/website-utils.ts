import { env } from "@ssr/common/env";

/**
 * Gets if we're in production
 */
export function isProduction() {
  return env.NEXT_PUBLIC_APP_ENV === "production";
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
  const buildTimeShort = process.env.NEXT_PUBLIC_BUILD_TIME_SHORT;

  return { buildId, buildTime, buildTimeShort };
}
