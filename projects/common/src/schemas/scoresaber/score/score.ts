import { z } from "zod";
import { HMD } from "../../../hmds";
import { ModifiersSchema } from "../../../score/modifier";
import { BeatLeaderScoreSchema } from "../../beatleader/score/score";
import { MapCharacteristic } from "../../map/map-characteristic";
import { MapDifficulty } from "../../map/map-difficulty";
import { nullToZeroNumberSchema, numberIncludingInfinitySchema } from "../../number";
import { ScoreSaberLeaderboardPlayerInfoSchema } from "../leaderboard/player-info";
import { ScoreSaberHistoryScoreSchema } from "./history-score";

export const ScoreSaberScoreSchema = z.object({
  // Identifiers
  playerId: z.string(),
  leaderboardId: z.number(),
  scoreId: z.number(),

  // Leaderboard information
  difficulty: z.string().transform(v => v as MapDifficulty),
  characteristic: z.string().transform(v => v as MapCharacteristic),

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
  hmd: z
    .string()
    .transform(v => v as HMD)
    .default("Unknown"),
  rightController: z.string().nullable(),
  leftController: z.string().nullable(),

  // Player information
  playerInfo: ScoreSaberLeaderboardPlayerInfoSchema,

  // Other scores
  beatLeaderScore: BeatLeaderScoreSchema.optional(),
  previousScore: ScoreSaberHistoryScoreSchema.optional(),

  timestamp: z.date(),
});

export type ScoreSaberScore = z.infer<typeof ScoreSaberScoreSchema>;
