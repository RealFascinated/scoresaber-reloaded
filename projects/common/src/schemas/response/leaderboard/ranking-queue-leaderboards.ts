import { Type, type StaticDecode } from "@sinclair/typebox";
import { ScoreSaberLeaderboardSchema } from "../../scoresaber/leaderboard/leaderboard";

export const RankingQueueLeaderboardSchema = Type.Composite([
  ScoreSaberLeaderboardSchema,
  Type.Object({
    difficultyCount: Type.Number(),
  }),
]);

export const RankingQueueLeaderboardsResponseSchema = Type.Object({
  nextInQueue: Type.Array(RankingQueueLeaderboardSchema),
  openRankUnrank: Type.Array(RankingQueueLeaderboardSchema),
  all: Type.Array(RankingQueueLeaderboardSchema),
});

export type RankingQueueLeaderboard = StaticDecode<typeof RankingQueueLeaderboardSchema>;
export type RankingQueueLeaderboardsResponse = StaticDecode<typeof RankingQueueLeaderboardsResponseSchema>;
