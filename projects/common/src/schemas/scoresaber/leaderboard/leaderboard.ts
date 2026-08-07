import { Type, type StaticDecode } from "@sinclair/typebox";
import { ScoreSaberLeaderboardDifficultySchema } from "./difficulty";
import { ScoreSaberLeaderboardStatusSchema } from "./status";

export const ScoreSaberLeaderboardSchema = Type.Object({
  id: Type.Number(),

  // Song information
  fullName: Type.String(),
  songHash: Type.String(),
  songName: Type.String(),
  songSubName: Type.String(),
  songAuthorName: Type.String(),

  // Song information
  songArt: Type.String(),

  // Level information
  levelAuthorName: Type.String(),

  // Difficulty information
  difficulty: ScoreSaberLeaderboardDifficultySchema,
  difficulties: Type.Array(ScoreSaberLeaderboardDifficultySchema),
  maxScore: Type.Number(),

  // Ranking information
  ranked: Type.Boolean(),
  qualified: Type.Boolean(),
  stars: Type.Number(),
  rankedDate: Type.Optional(Type.Date()),
  qualifiedDate: Type.Optional(Type.Date()),
  status: ScoreSaberLeaderboardStatusSchema,

  // Play information
  plays: Type.Number(),
  dailyPlays: Type.Number(),

  timestamp: Type.Date(),
});
export type ScoreSaberLeaderboard = StaticDecode<typeof ScoreSaberLeaderboardSchema>;
