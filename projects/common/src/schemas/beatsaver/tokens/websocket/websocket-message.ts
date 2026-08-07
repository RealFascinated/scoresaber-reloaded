import { Type, type StaticDecode } from "@sinclair/typebox";
import { BeatSaverMapTokenSchema } from "../map";

export const BeatSaverWebsocketMessageTokenSchema = Type.Object({
  /**
   * Command name
   */
  type: Type.Union([Type.Literal("MAP_UPDATE"), Type.Literal("MAP_CREATE")]),
  /**
   * Command data (BeatSaver map payload).
   */
  msg: BeatSaverMapTokenSchema,
});

export type BeatSaverWebsocketMessageToken = StaticDecode<typeof BeatSaverWebsocketMessageTokenSchema>;
