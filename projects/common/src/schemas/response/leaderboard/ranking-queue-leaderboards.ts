import { z } from "zod";
import { ScoreSaberLeaderboardSchema } from "../../scoresaber/leaderboard/leaderboard";

export const RankingQueueLeaderboardSchema = ScoreSaberLeaderboardSchema.extend({
  difficultyCount: z.number(),
});

export const RankingQueueLeaderboardsResponseSchema = z.object({
  nextInQueue: z.array(RankingQueueLeaderboardSchema),
  openRankUnrank: z.array(RankingQueueLeaderboardSchema),
  all: z.array(RankingQueueLeaderboardSchema),
});

export type RankingQueueLeaderboard = z.infer<typeof RankingQueueLeaderboardSchema>;
export type RankingQueueLeaderboardsResponse = z.infer<typeof RankingQueueLeaderboardsResponseSchema>;
