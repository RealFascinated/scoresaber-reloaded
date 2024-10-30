import ky from "ky";
import { Colors } from "@/common/colors";
import { Config } from "@ssr/common/config";

/**
 * Gets the average color of an image
 *
 * @param src the image url
 * @returns the average color
 */
export const getAverageColor = async (src: string) => {
  try {
    return await ky.get<{ color: string }>(`${Config.apiUrl}/image/averagecolor/${encodeURIComponent(src)}`).json();
  } catch {
    return {
      color: Colors.primary,
    };
  }
};
