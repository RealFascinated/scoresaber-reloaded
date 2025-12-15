import { SHARED_CONSTS } from "../../shared-consts";
import { z } from "zod";

export const customRankedPlaylistSchema = z.object({
  stars: z.object({
    min: z.number().min(0),
    max: z.number().max(SHARED_CONSTS.maxStars),
  }),
  sort: z.enum(["stars", "dateRanked"]),
});

export type CustomRankedPlaylist = z.infer<typeof customRankedPlaylistSchema>;

/**
 * Parses the raw settings into a custom ranked playlist settings object.
 *
 * @param settingsBase64 the raw settings
 * @returns the custom ranked playlist settings
 */
export function parseCustomRankedPlaylistSettings(settingsBase64?: string) {
  const settings: CustomRankedPlaylist = settingsBase64
    ? (JSON.parse(Buffer.from(settingsBase64, "base64").toString()) as CustomRankedPlaylist)
    : // Default values

      {
        stars: {
          min: 0,
          max: SHARED_CONSTS.maxStars,
        },
        sort: "stars",
      };

  // Enforce limitations
  settings.sort = settings.sort ?? "stars";
  settings.stars = {
    min: settings.stars.min < 0 ? 0 : settings.stars.min,
    max: settings.stars.max > SHARED_CONSTS.maxStars ? SHARED_CONSTS.maxStars : settings.stars.max,
  };

  return settings;
}

/**
 * Encodes the custom ranked playlist settings into a base64 string
 *
 * @param settings the custom ranked playlist settings
 * @returns the base64 encoded settings
 */

export function encodeCustomRankedPlaylistSettings(settings: CustomRankedPlaylist) {
  return Buffer.from(JSON.stringify(settings)).toString("base64");
}
