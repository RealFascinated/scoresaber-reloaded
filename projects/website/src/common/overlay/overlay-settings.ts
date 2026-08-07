import { OverlayDataClients } from "@/common/overlay/data-client";
import { Value } from "@sinclair/typebox/value";
import { OverlaySettingsSchema, type OverlaySettings } from "@ssr/common/schemas/overlay/overlay-settings";

export type { OverlaySettings } from "@ssr/common/schemas/overlay/overlay-settings";

export enum OverlayViews {
  ScoreInfo = "scoreInfo",
  PlayerInfo = "playerInfo",
  SongInfo = "songInfo",
}

/**
 * The default settings for the overlay.
 */
export const defaultOverlaySettings: OverlaySettings = {
  playerId: "",
  useRealTimeData: true,
  dataClient: OverlayDataClients.BeatSaberPlus,
  views: {
    [OverlayViews.ScoreInfo]: true,
    [OverlayViews.PlayerInfo]: true,
    [OverlayViews.SongInfo]: true,
  },
};

/**
 * Parses the raw settings into an overlay settings object.
 *
 * @param settingsBase64 the raw settings
 */
export function parseOverlaySettings(settingsBase64: string) {
  return Value.Parse(OverlaySettingsSchema, {
    ...defaultOverlaySettings, // Default values
    ...JSON.parse(Buffer.from(settingsBase64, "base64").toString()), // Override defaults
  });
}

/**
 * Encodes the overlay settings into a base64 string
 *
 * @param settings the overlay settings
 * @returns the base64 encoded settings
 */
export function encodeOverlaySettings(settings: OverlaySettings) {
  return Buffer.from(JSON.stringify(settings)).toString("base64");
}
