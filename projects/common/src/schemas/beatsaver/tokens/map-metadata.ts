import { Type, type StaticDecode } from "@sinclair/typebox";

export const BeatSaverMapMetadataTokenSchema = Type.Object({
  /**
   * The bpm of the song.
   */
  bpm: Type.Number(),

  /**
   * The song's length in seconds.
   */
  duration: Type.Number(),

  /**
   * The song's name.
   */
  songName: Type.String(),

  /**
   * The songs sub name.
   */
  songSubName: Type.String(),

  /**
   * The artist(s) name.
   */
  songAuthorName: Type.String(),

  /**
   * The song's author's url.
   * Not in Swagger `MapDetailMetadata`; kept optional for compatibility.
   */
  songAuthorUrl: Type.Optional(Type.String()),

  /**
   * The level mapper(s) name.
   */
  levelAuthorName: Type.String(),
});

export type BeatSaverMapMetadataToken = StaticDecode<typeof BeatSaverMapMetadataTokenSchema>;
