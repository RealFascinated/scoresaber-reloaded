import { SHARED_CONSTS } from "../shared-consts";
import { SnipeSettings, snipeSettingsSchema } from "./snipe-settings-schema";

/**
 * Parses the raw settings into a snipe settings object.
 *
 * @param settingsBase64 the raw settings
 * @param type the legacy type (old playlists)
 */
export function parseSnipePlaylistSettings(settingsBase64?: string) {
  return snipeSettingsSchema.parse({
    sort: "pp",
    sortDirection: "desc",
    rankedStatus: "all",
    requireBothScores: false,
    starRange: {
      min: 0,
      max: SHARED_CONSTS.maxStars,
    },
    accuracyRange: {
      min: 0,
      max: 100,
    },
    ...(settingsBase64
      ? (JSON.parse(Buffer.from(settingsBase64, "base64").toString()) as SnipeSettings)
      : {}),
  });
}

/**
 * Encodes the snipe playlist settings into a base64 string
 *
 * @param settings the snipe playlist settings
 * @returns the base64 encoded settings
 */
export function encodeSnipePlaylistSettings(settings: SnipeSettings) {
  return Buffer.from(JSON.stringify(settings)).toString("base64");
}
