import { Consts } from "../consts";
import { SnipeSettings } from "./snipe-settings-schema";

/**
 * Parses the raw settings into a snipe settings object.
 *
 * @param settingsBase64 the raw settings
 * @param type the legacy type (old playlists)
 */
export function parseSnipePlaylistSettings(settingsBase64?: string) {
  const settings: SnipeSettings = settingsBase64
    ? (JSON.parse(Buffer.from(settingsBase64, "base64").toString()) as SnipeSettings)
    : // Default values
      {
        name: "Snipe Playlist",
        limit: 100,
        sort: "pp",
        sortDirection: "desc",
        starRange: {
          min: 0,
          max: Consts.MAX_STARS,
        },
        accuracyRange: {
          min: 0,
          max: 100,
        },
      };

  // Enforce limitations
  settings.limit = (settings?.limit > 250 ? 250 : settings?.limit) ?? 100;
  settings.sort = settings?.sort ?? "pp";
  settings.sortDirection = settings?.sortDirection ?? "desc";
  settings.rankedStatus = settings?.rankedStatus ?? "all";

  return settings;
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
