import { z } from "zod";

export const ScoreSaberPlayerHistorySchema = z.object({
  rank: z.number().nullable().optional(),
  countryRank: z.number().nullable().optional(),
  pp: z.number().nullable().optional(),
  plusOnePp: z.number().nullable().optional(),
  totalScore: z.number().nullable().optional(),
  totalRankedScore: z.number().nullable().optional(),
  rankedScores: z.number().nullable().optional(),
  unrankedScores: z.number().nullable().optional(),
  rankedScoresImproved: z.number().nullable().optional(),
  unrankedScoresImproved: z.number().nullable().optional(),
  totalRankedScores: z.number().nullable().optional(),
  totalUnrankedScores: z.number().nullable().optional(),
  totalScores: z.number().nullable().optional(),
  averageRankedAccuracy: z.number().nullable().optional(),
  averageUnrankedAccuracy: z.number().nullable().optional(),
  averageAccuracy: z.number().nullable().optional(),
  medals: z.number().nullable().optional(),
  aPlays: z.number().nullable().optional(),
  sPlays: z.number().nullable().optional(),
  spPlays: z.number().nullable().optional(),
  ssPlays: z.number().nullable().optional(),
  sspPlays: z.number().nullable().optional(),
  godPlays: z.number().nullable().optional(),
});

export type ScoreSaberPlayerHistory = z.infer<typeof ScoreSaberPlayerHistorySchema>;
export type ScoreSaberPlayerHistoryEntries = Record<string, ScoreSaberPlayerHistory>;
