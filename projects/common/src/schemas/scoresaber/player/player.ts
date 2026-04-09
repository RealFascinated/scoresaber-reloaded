import { z } from "zod";
import { ScoreSaberPlayerHistorySchema } from "./history";
import { ScoreSaberPeakRankSchema } from "./peak-rank";

export const ScoreSaberBadgeSchema = z.object({
  url: z.string(),
  description: z.string(),
});

export const ScoreSaberRankPagesSchema = z.object({
  global: z.number(),
  country: z.number(),
  /** Omitted when the player has no medals rank / page (e.g. not on the medals leaderboard). */
  medals: z.number().optional(),
});

export const StatisticsChangeSchema = z.object({
  rank: z.number(),
  countryRank: z.number(),
  pp: z.number(),
  medals: z.number(),
});

export const StatisticChangeSchema = z.object({
  daily: StatisticsChangeSchema,
  weekly: StatisticsChangeSchema,
  monthly: StatisticsChangeSchema,
});

const PlayerCoreSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string(),
  country: z.string(),
  rank: z.number(),
  countryRank: z.number(),
  hmd: z.string().optional(),
  joinedDate: z.coerce.date(),
});

export const ScoreSaberPlayerBaseSchema = PlayerCoreSchema.extend({
  pp: z.number(),
  role: z.string().optional(),
  badges: z.array(ScoreSaberBadgeSchema).optional(),
  permissions: z.number(),
  banned: z.boolean(),
  inactive: z.boolean(),
});

export const ScoreSaberPlayerSchema = ScoreSaberPlayerBaseSchema.extend({
  statisticChange: StatisticChangeSchema.optional(),
  statistics: ScoreSaberPlayerHistorySchema,
  peakRank: ScoreSaberPeakRankSchema.optional(),
  rankPages: ScoreSaberRankPagesSchema,
  plusOnePp: z.number(),
  trackedSince: z.coerce.date(),
  medals: z.number(),
  medalsRank: z.number(),
  medalsCountryRank: z.number(),
  hmdBreakdown: z.record(z.string(), z.number()).optional(),
  rankPercentile: z.number(),
  currentStreak: z.number(),
  longestStreak: z.number(),
});

export type StatisticRange = "daily" | "weekly" | "monthly";

export type ScoreSaberBadge = z.infer<typeof ScoreSaberBadgeSchema>;
export type ScoreSaberRankPages = z.infer<typeof ScoreSaberRankPagesSchema>;
export type StatisticChange = z.infer<typeof StatisticChangeSchema>;
export type ScoreSaberPlayerBase = z.infer<typeof ScoreSaberPlayerBaseSchema>;
export type ScoreSaberPlayer = z.infer<typeof ScoreSaberPlayerSchema>;
