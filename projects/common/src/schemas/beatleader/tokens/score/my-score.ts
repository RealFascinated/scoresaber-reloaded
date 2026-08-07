import { Type, type StaticDecode } from "@sinclair/typebox";
import { BeatLeaderPlayerResponseSchema } from "../players/player";
import { BeatLeaderScoreImprovementSchema } from "./score-improvement";
import { BeatLeaderScoreOffsetsSchema } from "./score-offsets";

/**
 * Raw nested score summary (`ScoreResponseWithAcc`) token mirroring the upstream
 * `ScoreResponseWithAcc` schema, used for the `myScore` field of score
 * responses. `hmd`, `controller` and `status` are serialized as numbers by the
 * API, and `rankVoting`/`metadata` are null in practice, matching the raw score
 * token conventions.
 */
export const BeatLeaderMyScoreSchema = Type.Object({
  id: Type.Union([Type.Number(), Type.Null()]),
  baseScore: Type.Number(),
  modifiedScore: Type.Number(),
  accuracy: Type.Number(),
  playerId: Type.String(),
  pp: Type.Number(),
  withPp: Type.Boolean(),
  bonusPp: Type.Number(),
  passPP: Type.Number(),
  accPP: Type.Number(),
  techPP: Type.Number(),
  rank: Type.Number(),
  responseRank: Type.Number(),
  country: Type.Union([Type.String(), Type.Null()]),
  fcAccuracy: Type.Number(),
  fcPp: Type.Number(),
  weight: Type.Number(),
  replay: Type.String(),
  modifiers: Type.String(),
  badCuts: Type.Number(),
  missedNotes: Type.Number(),
  bombCuts: Type.Number(),
  wallsHit: Type.Number(),
  pauses: Type.Number(),
  fullCombo: Type.Boolean(),
  platform: Type.String(),
  maxCombo: Type.Number(),
  maxStreak: Type.Union([Type.Number(), Type.Null()]),
  hmd: Type.Number(),
  controller: Type.Number(),
  leaderboardId: Type.String(),
  timeset: Type.String(),
  timepost: Type.Number(),
  replaysWatched: Type.Number(),
  playCount: Type.Number(),
  lastTryTime: Type.Number(),
  priority: Type.Number(),
  originalId: Type.Number(),
  player: Type.Union([BeatLeaderPlayerResponseSchema, Type.Null()]),
  scoreImprovement: Type.Union([BeatLeaderScoreImprovementSchema, Type.Null()]),
  rankVoting: Type.Null(),
  metadata: Type.Null(),
  offsets: Type.Union([BeatLeaderScoreOffsetsSchema, Type.Null()]),
  sotwNominations: Type.Number(),
  status: Type.Number(),
  accLeft: Type.Number(),
  accRight: Type.Number(),
});

export type BeatLeaderMyScoreToken = StaticDecode<typeof BeatLeaderMyScoreSchema>;
