import { z } from "zod";
import { HMD } from "../../../hmds";
import { ModifiersSchema } from "../../../score/modifier";
import { BeatLeaderScoreSchema } from "../../beatleader/score/score";
import { MapCharacteristicSchema } from "../../map/map-characteristic";
import { MapDifficultySchema } from "../../map/map-difficulty";
import { numberIncludingInfinitySchema } from "../../number";
import { ScoreSaberLeaderboardPlayerInfoSchema } from "../leaderboard/player-info";
import { ScoreSaberHistoryScoreSchema } from "./history-score";

export const ScoreSaberMedalScoreSchema = z.object({
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
  medals: z.number(),
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
    .nullable(),
  rightController: z.string().nullable(),
  leftController: z.string().nullable(),

  // Player information
  playerInfo: ScoreSaberLeaderboardPlayerInfoSchema.nullable(),

  // Other scores
  beatLeaderScore: BeatLeaderScoreSchema.optional(),
  previousScore: ScoreSaberHistoryScoreSchema.optional(),

  timestamp: z.date(),
});

export type ScoreSaberMedalScore = z.infer<typeof ScoreSaberMedalScoreSchema>;
