import { Type } from "@sinclair/typebox";

export const BeatSaverMapMetadataSchema = Type.Object({
  bpm: Type.Number(),
  duration: Type.Number(),
  songName: Type.String(),
  songSubName: Type.String(),
  songAuthorName: Type.String(),
  songAuthorUrl: Type.String(),
  levelAuthorName: Type.String(),
});
