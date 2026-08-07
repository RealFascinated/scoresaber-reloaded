import { Type, type StaticDecode } from "@sinclair/typebox";
import { ScoreSaberPlayerHistorySchema } from "./history";
import { ScoreSaberPeakRankSchema } from "./peak-rank";

export const ScoreSaberBadgeSchema = Type.Object({
  url: Type.String(),
  description: Type.String(),
});

export const ScoreSaberRankPagesSchema = Type.Object({
  global: Type.Number(),
  country: Type.Number(),
  /** Omitted when the player has no medals rank / page (e.g. not on the medals leaderboard). */
  medals: Type.Optional(Type.Number()),
});

export const StatisticsChangeSchema = Type.Object({
  rank: Type.Number(),
  countryRank: Type.Number(),
  pp: Type.Number(),
  medals: Type.Number(),
});

export const StatisticChangeSchema = Type.Object({
  daily: StatisticsChangeSchema,
  weekly: StatisticsChangeSchema,
  monthly: StatisticsChangeSchema,
});

const PlayerCoreSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  avatar: Type.String(),
  country: Type.String(),
  rank: Type.Number(),
  countryRank: Type.Number(),
  hmd: Type.Optional(Type.String()),
  joinedDate: Type.Date(),
});

export const ScoreSaberPlayerBaseSchema = Type.Composite([
  PlayerCoreSchema,
  Type.Object({
    pp: Type.Number(),
    role: Type.Optional(Type.String()),
    badges: Type.Optional(Type.Array(ScoreSaberBadgeSchema)),
    permissions: Type.Number(),
    banned: Type.Boolean(),
    inactive: Type.Boolean(),
  }),
]);

export const ScoreSaberPlayerSchema = Type.Composite([
  ScoreSaberPlayerBaseSchema,
  Type.Object({
    statisticChange: Type.Optional(StatisticChangeSchema),
    statistics: ScoreSaberPlayerHistorySchema,
    peakRank: Type.Optional(ScoreSaberPeakRankSchema),
    rankPages: ScoreSaberRankPagesSchema,
    plusOnePp: Type.Number(),
    trackedSince: Type.Date(),
    medals: Type.Number(),
    medalsRank: Type.Number(),
    medalsCountryRank: Type.Number(),
    hmdBreakdown: Type.Optional(Type.Record(Type.String(), Type.Number())),
    rankPercentile: Type.Number(),
    currentStreak: Type.Number(),
    longestStreak: Type.Number(),
  }),
]);

export type StatisticRange = "daily" | "weekly" | "monthly";

export type ScoreSaberBadge = StaticDecode<typeof ScoreSaberBadgeSchema>;
export type ScoreSaberRankPages = StaticDecode<typeof ScoreSaberRankPagesSchema>;
export type StatisticChange = StaticDecode<typeof StatisticChangeSchema>;
export type ScoreSaberPlayerBase = StaticDecode<typeof ScoreSaberPlayerBaseSchema>;
export type ScoreSaberPlayer = StaticDecode<typeof ScoreSaberPlayerSchema>;
