import { Type, type StaticDecode } from "@sinclair/typebox";
import { HMD } from "../../../hmds";
import { ModifiersSchema } from "../../../score/modifier";
import { BeatLeaderScoreSchema } from "../../beatleader/score/score";
import { MapCharacteristic } from "../../map/map-characteristic";
import { MapDifficulty } from "../../map/map-difficulty";
import { nullToZeroNumberSchema, numberIncludingInfinitySchema } from "../../number";
import { ScoreSaberLeaderboardPlayerInfoSchema } from "../leaderboard/player-info";
import { ScoreSaberHistoryScoreSchema } from "./history-score";

export const ScoreSaberScoreSchema = Type.Object({
  // Identifiers
  playerId: Type.String(),
  leaderboardId: Type.Number(),
  scoreId: Type.Number(),

  // Leaderboard information
  difficulty: Type.Unsafe<MapDifficulty>(Type.String()),
  characteristic: Type.Unsafe<MapCharacteristic>(Type.String()),

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
  hmd: Type.Unsafe<HMD>(Type.Optional(Type.String({ default: "Unknown" }))),
  rightController: Type.Union([Type.String(), Type.Null()]),
  leftController: Type.Union([Type.String(), Type.Null()]),

  // Player information
  playerInfo: Type.Optional(ScoreSaberLeaderboardPlayerInfoSchema),

  // Other scores
  beatLeaderScore: Type.Optional(BeatLeaderScoreSchema),
  previousScore: Type.Optional(ScoreSaberHistoryScoreSchema),

  timestamp: Type.Date(),
});

export type ScoreSaberScore = StaticDecode<typeof ScoreSaberScoreSchema>;
