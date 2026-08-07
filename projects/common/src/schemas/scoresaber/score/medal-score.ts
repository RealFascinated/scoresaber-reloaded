import { Type, type StaticDecode } from "@sinclair/typebox";
import { HMD } from "../../../hmds";
import { ModifiersSchema } from "../../../score/modifier";
import { BeatLeaderScoreSchema } from "../../beatleader/score/score";
import { MapCharacteristicSchema } from "../../map/map-characteristic";
import { MapDifficultySchema } from "../../map/map-difficulty";
import { numberIncludingInfinitySchema } from "../../number";
import { ScoreSaberLeaderboardPlayerInfoSchema } from "../leaderboard/player-info";
import { ScoreSaberHistoryScoreSchema } from "./history-score";

export const ScoreSaberMedalScoreSchema = Type.Object({
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
  medals: Type.Number(),
  rank: Type.Number(),
  misses: Type.Number(),
  missedNotes: Type.Number(),
  badCuts: Type.Number(),
  maxCombo: Type.Number(),
  fullCombo: Type.Boolean(),
  modifiers: ModifiersSchema,

  // Headset information
  hmd: Type.Union([Type.Unsafe<HMD>(Type.String()), Type.Null()]),
  rightController: Type.Union([Type.String(), Type.Null()]),
  leftController: Type.Union([Type.String(), Type.Null()]),

  // Player information
  playerInfo: Type.Union([ScoreSaberLeaderboardPlayerInfoSchema, Type.Null()]),

  // Other scores
  beatLeaderScore: Type.Optional(BeatLeaderScoreSchema),
  previousScore: Type.Optional(ScoreSaberHistoryScoreSchema),

  timestamp: Type.Date(),
});

export type ScoreSaberMedalScore = StaticDecode<typeof ScoreSaberMedalScoreSchema>;
