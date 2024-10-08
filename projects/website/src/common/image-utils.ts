import { config } from "../../config";
import { cache } from "react";

/**
 * Proxies all non-localhost images to make them load faster.
 *
 * @param originalUrl the original image url
 * @returns the new image url
 */
export function getImageUrl(originalUrl: string) {
  return `${!config.siteUrl.includes("localhost") ? "https://img.fascinated.cc/upload/q_70/" : ""}${originalUrl}`;
}

/**
 * Gets the average color of an image
 *
 * @param src the image url
 * @returns the average color
 */
export const getAverageColor = cache(async (src: string) => {
  return {
    hex: "#fff",
  };
});