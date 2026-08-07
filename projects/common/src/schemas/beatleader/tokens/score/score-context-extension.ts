import { Type, type StaticDecode } from "@sinclair/typebox";
import { BeatLeaderLeaderboardSchema } from "../leaderboard/leaderboard";
import { BeatLeaderPlayerSchema } from "../player/player";
import { BeatLeaderScoreImprovementSchema } from "./score-improvement";

/**
 * Raw `ScoreContextExtension` token mirroring the upstream
 * `ScoreContextExtension` schema. `context` is serialized as a number by the
 * API even though the generated OpenAPI documents it as a string. The upstream
 * `scoreInstance` reference (a full `Score`) is recursive and is omitted.
 */
export const BeatLeaderScoreContextExtensionSchema = Type.Object({
  id: Type.Number(),
  playerId: Type.String(),
  player: Type.Union([BeatLeaderPlayerSchema, Type.Null()]),
  leaderboardId: Type.String(),
  leaderboard: BeatLeaderLeaderboardSchema,
  weight: Type.Number(),
  rank: Type.Number(),
  baseScore: Type.Number(),
  modifiedScore: Type.Number(),
  accuracy: Type.Number(),
  pp: Type.Number(),
  passPP: Type.Number(),
  accPP: Type.Number(),
  techPP: Type.Number(),
  bonusPp: Type.Number(),
  modifiers: Type.Union([Type.String(), Type.Null()]),
  modifiedStars: Type.Number(),
  timepost: Type.Number(),
  priority: Type.Number(),
  scoreId: Type.Union([Type.Number(), Type.Null()]),
  qualification: Type.Boolean(),
  banned: Type.Boolean(),
  bot: Type.Boolean(),
  context: Type.Number(),
  scoreImprovement: Type.Union([BeatLeaderScoreImprovementSchema, Type.Null()]),
  accRight: Type.Number(),
  accLeft: Type.Number(),
  fcAccuracy: Type.Number(),
  fcPp: Type.Number(),
});

export type BeatLeaderScoreContextExtensionToken = StaticDecode<typeof BeatLeaderScoreContextExtensionSchema>;
