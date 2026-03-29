import { z } from "zod";
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
  hmd: z.string().nullable(),
  rightController: z.string().nullable(),
  leftController: z.string().nullable(),

  // Player information
  playerInfo: ScoreSaberLeaderboardPlayerInfoSchema.nullable(),

  // todo: beatleader score
  beatLeaderScore: BeatLeaderScoreSchema.optional(),
  previousScore: ScoreSaberHistoryScoreSchema.optional(),

  timestamp: z.date(),
});

export type ScoreSaberMedalScore = z.infer<typeof ScoreSaberMedalScoreSchema>;
