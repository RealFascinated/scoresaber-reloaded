import { Type, type StaticDecode } from "typebox";

export const OverlaySettingsSchema = Type.Object({
  playerId: Type.String(),
  useRealTimeData: Type.Boolean(),
  dataClient: Type.String(),
  views: Type.Record(
    Type.Union([Type.Literal("scoreInfo"), Type.Literal("playerInfo"), Type.Literal("songInfo")]),
    Type.Boolean()
  ),
});
export type OverlaySettings = StaticDecode<typeof OverlaySettingsSchema>;
