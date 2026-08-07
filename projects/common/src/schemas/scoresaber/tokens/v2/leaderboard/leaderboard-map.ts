import { Type, type StaticDecode } from "@sinclair/typebox";

export const ScoreSaberV2LeaderboardMapTokenSchema = Type.Object({
  id: Type.Number(),
  hash: Type.String(),
  bsid: Type.Union([Type.String(), Type.Null()]),
  songName: Type.String(),
  songSubName: Type.String(),
  songAuthorName: Type.String(),
  levelAuthorName: Type.String(),
  bpm: Type.Number(),
  coverUrl: Type.String(),
  verified: Type.Boolean(),
});

export type ScoreSaberV2LeaderboardMapToken = StaticDecode<typeof ScoreSaberV2LeaderboardMapTokenSchema>;
