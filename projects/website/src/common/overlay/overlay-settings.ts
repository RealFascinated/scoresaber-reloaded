import { OverlayDataClients } from "@/common/overlay/data-client";

export enum OverlayViews {
  ScoreInfo = 1,
  PlayerInfo = 2,
  SongInfo = 3,
}

export type OverlaySettings = {
  /**
   * The id of the player that will
   * be used in the overlay.
   */
  playerId: string;

  /**
   * Whether to get real-time data from the data client.
   */
  useRealTimeData: boolean;

  /**
   * The data client to fetch game data from.
   */
  dataClient: OverlayDataClients;

  /**
   * The state of the overlay views.
   */
  views: Record<OverlayViews, boolean>;
};

/**
 * The default settings for the overlay.
 */
export const defaultOverlaySettings: OverlaySettings = {
  playerId: "",
  useRealTimeData: true,
  dataClient: OverlayDataClients.HTTPSiraStatus,
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
  return {
    ...defaultOverlaySettings, // Default values
    ...(JSON.parse(Buffer.from(settingsBase64, "base64").toString()) as OverlaySettings), // Override defaults
  };
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
