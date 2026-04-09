import { z } from "zod";

export const ScoreSaberPlayerStatisticsSchema = z.object({
  rank: z.number(),
  countryRank: z.number(),
  pp: z.number(),
  plusOnePp: z.number(),
  totalScore: z.number(),
  totalRankedScore: z.number(),
  rankedScores: z.number(),
  unrankedScores: z.number(),
  totalRankedScores: z.number(),
  totalUnrankedScores: z.number(),
  totalScores: z.number(),
  averageRankedAccuracy: z.number(),
  averageUnrankedAccuracy: z.number(),
  averageAccuracy: z.number(),
  medals: z.number(),
  replaysWatched: z.number(),
  aPlays: z.number(),
  sPlays: z.number(),
  spPlays: z.number(),
  ssPlays: z.number(),
  sspPlays: z.number(),
  godPlays: z.number(),
});

export type ScoreSaberPlayerStatistics = z.infer<typeof ScoreSaberPlayerStatisticsSchema>;
