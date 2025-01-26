export type OverlaySettings = {
  /**
   * The id of the player that will
   * be used in the overlay.
   */
  playerId: string;
};

/**
 * Parses the raw settings into an overlay settings object.
 *
 * @param settingsBase64 the raw settings
 */
export function parseOverlaySettings(settingsBase64: string) {
  return JSON.parse(Buffer.from(settingsBase64, "base64").toString()) as OverlaySettings;
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
