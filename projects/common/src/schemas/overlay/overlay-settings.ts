import { Type, type StaticDecode } from "@sinclair/typebox";

export const OverlaySettingsSchema = Type.Object({
  /**
   * The id of the player that will
   * be used in the overlay.
   */
  playerId: Type.String(),
  /**
   * Whether to get real-time data from the data client.
   */
  useRealTimeData: Type.Boolean(),
  /**
   * The data client to fetch game data from.
   */
  dataClient: Type.String(),
  /**
   * The state of the overlay views.
   */
  views: Type.Record(
    Type.Union([Type.Literal("scoreInfo"), Type.Literal("playerInfo"), Type.Literal("songInfo")]),
    Type.Boolean()
  ),
});
export type OverlaySettings = StaticDecode<typeof OverlaySettingsSchema>;
