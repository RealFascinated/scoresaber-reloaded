import { z } from "zod";
import { ScoreSaberLeaderboardDifficultySchema } from "./difficulty";
import { ScoreSaberLeaderboardStatusSchema } from "./status";

export const ScoreSaberLeaderboardSchema = z.object({
  id: z.number(),

  // Song information
  fullName: z.string(),
  songHash: z.string(),
  songName: z.string(),
  songSubName: z.string(),
  songAuthorName: z.string(),

  // Song information
  songArt: z.string(),

  // Level information
  levelAuthorName: z.string(),

  // Difficulty information
  difficulty: ScoreSaberLeaderboardDifficultySchema,
  difficulties: z.array(ScoreSaberLeaderboardDifficultySchema),
  maxScore: z.number(),

  // Ranking information
  ranked: z.boolean(),
  qualified: z.boolean(),
  stars: z.number(),
  rankedDate: z.date().optional(),
  qualifiedDate: z.date().optional(),
  status: ScoreSaberLeaderboardStatusSchema,

  // Play information
  plays: z.number(),
  dailyPlays: z.number(),

  timestamp: z.date(),
});
export type ScoreSaberLeaderboard = z.infer<typeof ScoreSaberLeaderboardSchema>;
