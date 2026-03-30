import { z } from "zod";
import { ModifiersSchema } from "../../../score/modifier";
import { BeatLeaderScoreSchema } from "../../beatleader/score/score";
import { MapCharacteristicSchema } from "../../map/map-characteristic";
import { MapDifficultySchema } from "../../map/map-difficulty";
import { nullToZeroNumberSchema, numberIncludingInfinitySchema } from "../../number";
import { ScoreSaberLeaderboardPlayerInfoSchema } from "../leaderboard/player-info";

export const ScoreSaberHistoryScoreSchema = z.object({
  // Identifiers
  playerId: z.string(),
  leaderboardId: z.number(),
  scoreId: z.number(),

  // Leaderboard information
  difficulty: MapDifficultySchema,
  characteristic: MapCharacteristicSchema,

  // Score information
  score: z.number(),
  accuracy: numberIncludingInfinitySchema,
  pp: nullToZeroNumberSchema,
  weight: nullToZeroNumberSchema,
  rank: z.number(),
  misses: z.number(),
  missedNotes: z.number(),
  badCuts: z.number(),
  maxCombo: z.number(),
  fullCombo: z.boolean(),
  modifiers: ModifiersSchema,

  // Headset information
  hmd: z.string().nullable(),
  rightController: z.string().nullable(),
  leftController: z.string().nullable(),

  // Player information
  playerInfo: ScoreSaberLeaderboardPlayerInfoSchema.nullable(),

  // Change information
  change: z.object({
    score: z.number(),
    accuracy: numberIncludingInfinitySchema,
    pp: z.number(),
    misses: z.number(),
    missedNotes: z.number(),
    badCuts: z.number(),
    maxCombo: z.number(),
  }),

  // Other scores
  beatLeaderScore: BeatLeaderScoreSchema.optional(),

  timestamp: z.date(),
});

export type ScoreSaberHistoryScore = z.infer<typeof ScoreSaberHistoryScoreSchema>;
