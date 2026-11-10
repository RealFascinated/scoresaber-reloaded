import { Type, type StaticDecode } from "typebox";

export const BeatSaverMapMetadataTokenSchema = Type.Object({
  bpm: Type.Number(),

  duration: Type.Number(),

  songName: Type.String(),

  songSubName: Type.String(),

  songAuthorName: Type.String(),

  /**
   * The song's author's url.
   * Not in Swagger `MapDetailMetadata`; kept optional for compatibility.
   */
  songAuthorUrl: Type.Optional(Type.String()),

  levelAuthorName: Type.String(),
});

export type BeatSaverMapMetadataToken = StaticDecode<typeof BeatSaverMapMetadataTokenSchema>;
