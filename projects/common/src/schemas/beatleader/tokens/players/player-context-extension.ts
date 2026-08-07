import { Type, type StaticDecode } from "@sinclair/typebox";
import { BeatLeaderPlayerScoreStatsSchema } from "./score-stats";

/**
 * Raw `PlayerContextExtension` token mirroring the upstream
 * `PlayerContextExtension` schema. `context` is serialized as a number by the
 * API even though the generated OpenAPI documents it as a string.
 */
export const BeatLeaderPlayerContextExtensionSchema = Type.Object({
  id: Type.Number(),
  context: Type.Number(),
  pp: Type.Number(),
  accPp: Type.Number(),
  techPp: Type.Number(),
  passPp: Type.Number(),
  rank: Type.Number(),
  country: Type.String(),
  countryRank: Type.Number(),
  level: Type.Number(),
  experience: Type.Number(),
  prestige: Type.Number(),
  lastWeekPp: Type.Number(),
  lastWeekRank: Type.Number(),
  lastWeekCountryRank: Type.Number(),
  name: Type.String(),
  alias: Type.Union([Type.String(), Type.Null()]),
  playerId: Type.String(),
  scoreStats: Type.Union([BeatLeaderPlayerScoreStatsSchema, Type.Null()]),
  banned: Type.Boolean(),
});

export type BeatLeaderPlayerContextExtensionToken = StaticDecode<
  typeof BeatLeaderPlayerContextExtensionSchema
>;
