import { z } from "zod";
import { ScoreSaberPeakRankSchema } from "./player/peak-rank";
import { ScoreSaberPlayerScoreStatsSchema } from "./player/score-stats";

export const ScoreSaberAccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string(),
  country: z
    .string()
    .nullable()
    .transform(value => value ?? "Unknown"),
  peakRank: ScoreSaberPeakRankSchema.optional(),
  seededScores: z.boolean().optional(),
  seededBeatLeaderScores: z.boolean().optional(),
  cachedProfilePicture: z.boolean().optional(),
  trackReplays: z.boolean(),
  inactive: z.boolean(),
  banned: z.boolean(),
  hmd: z.string().nullable(),
  pp: z.number(),
  medals: z.number(),
  scoreStats: ScoreSaberPlayerScoreStatsSchema,
  trackedSince: z.coerce.date(),
  joinedDate: z.coerce.date(),
});

export type ScoreSaberAccount = z.infer<typeof ScoreSaberAccountSchema>;
