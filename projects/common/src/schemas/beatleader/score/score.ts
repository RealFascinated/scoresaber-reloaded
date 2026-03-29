import { z } from "zod";

export const BeatLeaderMissesSchema = z.object({
  misses: z.number(),
  missedNotes: z.number(),
  bombCuts: z.number(),
  wallsHit: z.number(),
  badCuts: z.number(),
});

export const BeatLeaderScoreSchema = z.object({
  // Identifiers
  playerId: z.string(),
  songHash: z.string(),
  leaderboardId: z.string(),
  scoreId: z.number(),

  pauses: z.number(),
  fcAccuracy: z.number(),
  fullCombo: z.boolean(),
  handAccuracy: z.object({
    left: z.number(),
    right: z.number(),
  }),
  misses: BeatLeaderMissesSchema,
  scoreImprovement: z.object({
    score: z.number(),
    pauses: z.number(),
    misses: BeatLeaderMissesSchema,
    handAccuracy: z.object({
      left: z.number(),
      right: z.number(),
    }),
  }),
  savedReplay: z.boolean(),
  timestamp: z.date(),
});

export type BeatLeaderScore = z.infer<typeof BeatLeaderScoreSchema>;
