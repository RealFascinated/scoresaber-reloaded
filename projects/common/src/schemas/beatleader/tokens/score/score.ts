import { Type, type StaticDecode } from "@sinclair/typebox";
import { BeatLeaderLeaderboardSchema } from "../leaderboard/leaderboard";
import { BeatLeaderPlayerSchema } from "../player/player";
import { BeatLeaderMyScoreSchema } from "./my-score";
import { BeatLeaderScoreContextExtensionSchema } from "./score-context-extension";
import { BeatLeaderScoreImprovementSchema } from "./score-improvement";
import { BeatLeaderScoreOffsetsSchema } from "./score-offsets";

/**
 * Raw score token for the player scores page and websocket score payloads. Mirrors
 * the upstream `ScoreResponseWithMyScore`/`Score` schemas: `myScore`, `rankVoting`,
 * `metadata` and `scoreImprovement` are nullable in the API despite the generated
 * OpenAPI marking them non-null. `validContexts`, `hmd`, `controller` and `status`
 * are serialized as numbers by the API, so they stay raw numbers.
 */
export const BeatLeaderScoreSchema = Type.Object({
  /** API returns null or a nested score summary (`ScoreResponseWithAcc`). */
  myScore: Type.Union([Type.Null(), BeatLeaderMyScoreSchema]),
  validContexts: Type.Number(),
  leaderboard: BeatLeaderLeaderboardSchema,
  contextExtensions: Type.Optional(
    Type.Union([Type.Array(BeatLeaderScoreContextExtensionSchema), Type.Null()])
  ),
  accLeft: Type.Number(),
  accRight: Type.Number(),
  id: Type.Number(),
  baseScore: Type.Number(),
  modifiedScore: Type.Number(),
  accuracy: Type.Number(),
  playerId: Type.String(),
  pp: Type.Number(),
  withPp: Type.Optional(Type.Boolean()),
  bonusPp: Type.Number(),
  passPP: Type.Number(),
  accPP: Type.Number(),
  techPP: Type.Number(),
  rank: Type.Number(),
  responseRank: Type.Optional(Type.Number()),
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
  lastTryTime: Type.Optional(Type.Number()),
  priority: Type.Number(),
  originalId: Type.Optional(Type.Number()),
  player: Type.Union([BeatLeaderPlayerSchema, Type.Null()]),
  // BeatLeader returns null here unless the API is queried with includeIO=true
  // (and can return null for individual scores even then), so accept null.
  scoreImprovement: Type.Union([BeatLeaderScoreImprovementSchema, Type.Null()]),
  rankVoting: Type.Null(),
  metadata: Type.Null(),
  offsets: Type.Optional(Type.Union([BeatLeaderScoreOffsetsSchema, Type.Null()])),
  sotwNominations: Type.Optional(Type.Number()),
  status: Type.Optional(Type.Number()),
  experience: Type.Optional(Type.Number()),
});

export type BeatLeaderScoreToken = StaticDecode<typeof BeatLeaderScoreSchema>;
