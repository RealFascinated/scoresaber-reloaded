import { createCanvas, loadImage } from "canvas";
import { config } from "../../config";
import ky from "ky";
import { extractColors } from "extract-colors";
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
  const before = performance.now();
  console.log(`Getting average color of "${src}"...`);
  try {
    const response = await ky.get(`https://img.fascinated.cc/upload/w_64,h_64,o_jpg/${src}`);
    if (response.status !== 200) {
      return undefined;
    }

    const imageBuffer = await response.arrayBuffer();

    // Create an image from the buffer using canvas
    const img = await loadImage(Buffer.from(imageBuffer));
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");

    // Draw the image onto the canvas
    ctx.drawImage(img, 0, 0);

    // Get the pixel data from the canvas
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const { data, width, height } = imageData;

    // Use your extractColors function to calculate the average color
    const color = await extractColors({ data, width, height });

    console.log(`Found average color of "${src}" in ${(performance.now() - before).toFixed(0)}ms`);
    return color[2];
  } catch (error) {
    console.error("Error while getting average color:", error);
    return undefined;
  }
});
