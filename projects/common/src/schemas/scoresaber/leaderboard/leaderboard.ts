import { Type, type StaticDecode } from "typebox";
import { DateSchema } from "../../date";
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
  rankedDate: Type.Optional(DateSchema),
  qualifiedDate: Type.Optional(DateSchema),
  status: ScoreSaberLeaderboardStatusSchema,

  // Play information
  plays: Type.Number(),
  dailyPlays: Type.Number(),

  timestamp: DateSchema,
});
export type ScoreSaberLeaderboard = StaticDecode<typeof ScoreSaberLeaderboardSchema>;
