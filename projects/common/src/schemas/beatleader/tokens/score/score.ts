import { z } from "zod";
import { BeatLeaderLeaderboardSchema } from "../leaderboard/leaderboard";
import { BeatLeaderPlayerSchema } from "../player/player";
import { BeatLeaderScoreImprovementSchema } from "./score-improvement";
import { BeatLeaderScoreOffsetsSchema } from "./score-offsets";

export const BeatLeaderScoreSchema = z
  .object({
    /** API returns null or a nested score summary object. */
    myScore: z.union([z.null(), z.object({}).passthrough()]),
    validContexts: z.number(),
    leaderboard: BeatLeaderLeaderboardSchema,
    contextExtensions: z.null().optional(),
    accLeft: z.number(),
    accRight: z.number(),
    id: z.number(),
    baseScore: z.number(),
    modifiedScore: z.number(),
    accuracy: z.number(),
    playerId: z.string(),
    pp: z.number(),
    bonusPp: z.number(),
    passPP: z.number(),
    accPP: z.number(),
    techPP: z.number(),
    rank: z.number(),
    country: z.union([z.string(), z.null()]),
    fcAccuracy: z.number(),
    fcPp: z.number(),
    weight: z.number(),
    replay: z.string(),
    modifiers: z.string(),
    badCuts: z.number(),
    missedNotes: z.number(),
    bombCuts: z.number(),
    wallsHit: z.number(),
    pauses: z.number(),
    fullCombo: z.boolean(),
    platform: z.string(),
    maxCombo: z.number(),
    maxStreak: z.union([z.number(), z.null()]),
    hmd: z.number(),
    controller: z.number(),
    leaderboardId: z.string(),
    timeset: z.string(),
    timepost: z.number(),
    replaysWatched: z.number(),
    playCount: z.number(),
    priority: z.number(),
    player: BeatLeaderPlayerSchema.nullable(),
    scoreImprovement: BeatLeaderScoreImprovementSchema,
    rankVoting: z.null(),
    metadata: z.null(),
    offsets: BeatLeaderScoreOffsetsSchema.nullable().optional(),
  })
  .passthrough();

export type BeatLeaderScoreToken = z.infer<typeof BeatLeaderScoreSchema>;
