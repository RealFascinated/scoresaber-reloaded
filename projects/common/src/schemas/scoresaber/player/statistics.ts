import { Type, type StaticDecode } from "@sinclair/typebox";

export const ScoreSaberPlayerStatisticsSchema = Type.Object({
  rank: Type.Number(),
  countryRank: Type.Number(),
  pp: Type.Number(),
  plusOnePp: Type.Number(),
  totalScore: Type.Number(),
  totalRankedScore: Type.Number(),
  rankedScores: Type.Number(),
  unrankedScores: Type.Number(),
  totalRankedScores: Type.Number(),
  totalUnrankedScores: Type.Number(),
  totalScores: Type.Number(),
  averageRankedAccuracy: Type.Number(),
  averageUnrankedAccuracy: Type.Number(),
  averageAccuracy: Type.Number(),
  medals: Type.Number(),
  replaysWatched: Type.Number(),
  aPlays: Type.Number(),
  sPlays: Type.Number(),
  spPlays: Type.Number(),
  ssPlays: Type.Number(),
  sspPlays: Type.Number(),
  godPlays: Type.Number(),
});

export type ScoreSaberPlayerStatistics = StaticDecode<typeof ScoreSaberPlayerStatisticsSchema>;
