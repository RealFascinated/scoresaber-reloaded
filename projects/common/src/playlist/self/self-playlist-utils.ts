import { SHARED_CONSTS } from "../../shared-consts";
import { SelfPlaylistSettings, selfPlaylistSettingsSchema } from "./self-playlist-settings-schema";

/**
 * Parses the raw settings into a self playlist settings object.
 *
 * @param settingsBase64 the raw settings
 */
export function parseSelfPlaylistSettings(settingsBase64?: string) {
  return selfPlaylistSettingsSchema.parse(
    {
      sort: "pp",
      sortDirection: "desc",
      rankedStatus: "all",
      starRange: {
        min: 0,
        max: SHARED_CONSTS.maxStars,
      },
      accuracyRange: {
        min: 0,
        max: 100,
      },
      ...(settingsBase64
        ? (JSON.parse(Buffer.from(settingsBase64, "base64").toString()) as SelfPlaylistSettings)
        : {}),
    },
    { reportInput: true }
  );
}

/**
 * Encodes the self playlist settings into a base64 string
 *
 * @param settings the self playlist settings
 * @returns the base64 encoded settings
 */
export function encodeSelfPlaylistSettings(settings: SelfPlaylistSettings) {
  return Buffer.from(JSON.stringify(settings)).toString("base64");
}
