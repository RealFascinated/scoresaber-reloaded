import { z } from "zod";

export const BeatLeaderPlayerScoreStatsSchema = z
  .object({
    topHMD: z.number(),
    topPercent: z.number(),
    topPp: z.number(),
    totalRankedScore: z.number(),
    averageRankedAccuracy: z.number(),
    totalPlayCount: z.number(),
    rankedPlayCount: z.number(),
    replaysWatched: z.number(),
  })
  .passthrough();

export type BeatLeaderPlayerScoreStatsToken = z.infer<typeof BeatLeaderPlayerScoreStatsSchema>;

// Backwards-compatible aliases
export const BeatLeaderPlayersScoreStatsSchema = BeatLeaderPlayerScoreStatsSchema;
export type BeatLeaderPlayersScoreStatsToken = BeatLeaderPlayerScoreStatsToken;
