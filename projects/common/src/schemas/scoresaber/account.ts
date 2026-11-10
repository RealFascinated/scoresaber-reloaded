import { Type, type StaticDecode } from "typebox";
import { DateSchema } from "../date";
import { ScoreSaberPeakRankSchema } from "./player/peak-rank";

export const ScoreSaberAccountSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  avatar: Type.String(),
  country: Type.Codec(Type.Union([Type.String(), Type.Null()]))
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
  trackedSince: DateSchema,
  joinedDate: DateSchema,
});

export type ScoreSaberAccount = StaticDecode<typeof ScoreSaberAccountSchema>;
