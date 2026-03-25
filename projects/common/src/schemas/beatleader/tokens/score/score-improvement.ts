import { z } from "zod";

export const BeatLeaderScoreImprovementSchema = z
  .object({
    id: z.number(),
    // BeatLeader REST sometimes returns this as a unix timestamp number, but it can also be an empty string.
    timeset: z.union([z.number(), z.string()]),
    score: z.number(),
    accuracy: z.number(),
    pp: z.number(),
    bonusPp: z.number(),
    rank: z.number(),
    accRight: z.number(),
    accLeft: z.number(),
    averageRankedAccuracy: z.number(),
    totalPp: z.number(),
    totalRank: z.number(),
    badCuts: z.number(),
    missedNotes: z.number(),
    bombCuts: z.number(),
    wallsHit: z.number(),
    pauses: z.number(),
  })
  .loose();

export type BeatLeaderScoreImprovementToken = z.infer<typeof BeatLeaderScoreImprovementSchema>;
