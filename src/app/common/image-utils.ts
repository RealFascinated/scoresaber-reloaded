import { config } from "../../../config";

/**
 * Proxies all non-localhost images to make them load faster.
 *
 * @param originalUrl the original image url
 * @returns the new image url
 */
export function getImageUrl(originalUrl: string) {
  // Remove the prepending slash
  if (originalUrl.startsWith("/")) {
    originalUrl = originalUrl.substring(1);
  }
  return `${!config.siteUrl.includes("localhost") ? "https://img.fascinated.cc/upload/q_70/" : ""}${originalUrl}`;
}
