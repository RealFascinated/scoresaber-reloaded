import { Type, type StaticDecode } from "@sinclair/typebox";
import { BeatSaverMapTokenSchema } from "../map";

/** BeatSaver `SearchResponse.info` subset (Swagger). */
export const BeatSaverLatestMapsSearchInfoSchema = Type.Object({
  duration: Type.Optional(Type.Number()),
  pages: Type.Optional(Type.Number()),
  total: Type.Optional(Type.Number()),
});

export type BeatSaverLatestMapsSearchInfo = StaticDecode<typeof BeatSaverLatestMapsSearchInfoSchema>;

/** BeatSaver `SearchResponse` for `/maps/latest` (Swagger). */
export const BeatSaverLatestMapsTokenSchema = Type.Object({
  /**
   * The maps.
   */
  docs: Type.Array(BeatSaverMapTokenSchema),

  info: Type.Optional(BeatSaverLatestMapsSearchInfoSchema),
  redirect: Type.Optional(Type.String()),
});

export type BeatSaverLatestMapsToken = StaticDecode<typeof BeatSaverLatestMapsTokenSchema>;
