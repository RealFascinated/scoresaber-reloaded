import { Type, type StaticDecode } from "@sinclair/typebox";

export const ScoreSaberPlayerHistorySchema = Type.Object({
  rank: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  countryRank: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  pp: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  plusOnePp: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  totalScore: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  totalRankedScore: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  rankedScores: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  unrankedScores: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  rankedScoresImproved: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  unrankedScoresImproved: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  totalRankedScores: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  totalUnrankedScores: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  totalScores: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  averageRankedAccuracy: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  averageUnrankedAccuracy: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  averageAccuracy: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  medals: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  aPlays: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  sPlays: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  spPlays: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  ssPlays: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  sspPlays: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  godPlays: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
});

export type ScoreSaberPlayerHistory = StaticDecode<typeof ScoreSaberPlayerHistorySchema>;
export type ScoreSaberPlayerHistoryEntries = Record<string, ScoreSaberPlayerHistory>;
