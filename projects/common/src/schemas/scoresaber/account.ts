import { Type, type StaticDecode } from "@sinclair/typebox";
import { ScoreSaberPeakRankSchema } from "./player/peak-rank";

export const ScoreSaberAccountSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  avatar: Type.String(),
  country: Type.Transform(Type.Union([Type.String(), Type.Null()]))
    .Decode(value => value ?? "Unknown")
    .Encode(value => value),
  peakRank: Type.Optional(ScoreSaberPeakRankSchema),
  seededScores: Type.Optional(Type.Boolean()),
  seededBeatLeaderScores: Type.Optional(Type.Boolean()),
  trackReplays: Type.Boolean(),
  inactive: Type.Boolean(),
  banned: Type.Boolean(),
  hmd: Type.Union([Type.String(), Type.Null()]),
  pp: Type.Number(),
  medals: Type.Number(),
  medalsRank: Type.Number(),
  medalsCountryRank: Type.Number(),
  currentStreak: Type.Number(),
  longestStreak: Type.Number(),
  trackedSince: Type.Date(),
  joinedDate: Type.Date(),
});

export type ScoreSaberAccount = StaticDecode<typeof ScoreSaberAccountSchema>;
