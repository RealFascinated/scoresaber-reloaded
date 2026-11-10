import { Type, type StaticDecode } from "typebox";
import { OverlayViewSchema } from "./overlay-view";

export const OverlaySettingsSchema = Type.Object({
  playerId: Type.String(),
  useRealTimeData: Type.Boolean(),
  dataClient: Type.String(),
  views: Type.Record(OverlayViewSchema, Type.Boolean()),
});
export type OverlaySettings = StaticDecode<typeof OverlaySettingsSchema>;
