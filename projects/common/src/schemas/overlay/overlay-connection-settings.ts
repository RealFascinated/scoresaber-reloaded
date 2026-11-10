import { Type, type StaticDecode } from "typebox";

/** Where an overlay gets its data from. */
export const OverlayConnectionSettingsSchema = Type.Object(
  {
    playerId: Type.String({ maxLength: 32 }),
    useRealTimeData: Type.Boolean(),
    dataClient: Type.Union([Type.Literal("HTTPSiraStatus"), Type.Literal("BeatSaberPlus")]),
  },
  { additionalProperties: false }
);
export type OverlayConnectionSettings = StaticDecode<typeof OverlayConnectionSettingsSchema>;
