import { Type, type StaticDecode } from "@sinclair/typebox";
import { ModifiersSchema } from "../../../score/modifier";
import { BeatLeaderScoreSchema } from "../../beatleader/score/score";
import { MapCharacteristicSchema } from "../../map/map-characteristic";
import { MapDifficultySchema } from "../../map/map-difficulty";
import { nullToZeroNumberSchema, numberIncludingInfinitySchema } from "../../number";
import { ScoreSaberLeaderboardPlayerInfoSchema } from "../leaderboard/player-info";

export const ScoreSaberHistoryScoreSchema = Type.Object({
  // Identifiers
  playerId: Type.String(),
  leaderboardId: Type.Number(),
  scoreId: Type.Number(),

  // Leaderboard information
  difficulty: MapDifficultySchema,
  characteristic: MapCharacteristicSchema,

  // Score information
  score: Type.Number(),
  accuracy: numberIncludingInfinitySchema,
  pp: nullToZeroNumberSchema,
  weight: nullToZeroNumberSchema,
  rank: Type.Number(),
  misses: Type.Number(),
  missedNotes: Type.Number(),
  badCuts: Type.Number(),
  maxCombo: Type.Number(),
  fullCombo: Type.Boolean(),
  modifiers: ModifiersSchema,

  // Headset information
  hmd: Type.Union([Type.String(), Type.Null()]),
  rightController: Type.Union([Type.String(), Type.Null()]),
  leftController: Type.Union([Type.String(), Type.Null()]),

  // Player information
  playerInfo: Type.Union([ScoreSaberLeaderboardPlayerInfoSchema, Type.Null()]),

  // Change information
  change: Type.Object({
    score: Type.Number(),
    accuracy: numberIncludingInfinitySchema,
    pp: Type.Optional(Type.Number()),
    misses: Type.Number(),
    missedNotes: Type.Number(),
    badCuts: Type.Number(),
    maxCombo: Type.Number(),
  }),

  // Other scores
  beatLeaderScore: Type.Optional(BeatLeaderScoreSchema),

  timestamp: Type.Date(),
});

export type ScoreSaberHistoryScore = StaticDecode<typeof ScoreSaberHistoryScoreSchema>;
