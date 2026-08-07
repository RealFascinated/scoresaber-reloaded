import { Type, type StaticDecode } from "@sinclair/typebox";
import { ScoreSaberLeaderboardTokenSchema } from "./leaderboard";

export const ScoreSaberRankingRequestVotesTokenSchema = Type.Object({
  upvotes: Type.Number(),
  downvotes: Type.Number(),
  myVote: Type.Boolean(),
  neutral: Type.Number(),
});

export type ScoreSaberRankingRequestVotesToken = StaticDecode<
  typeof ScoreSaberRankingRequestVotesTokenSchema
>;

export const RankingRequestTokenSchema = Type.Object({
  requestId: Type.Number(),
  weight: Type.Number(),
  leaderboardInfo: ScoreSaberLeaderboardTokenSchema,
  created_at: Type.String(),
  totalRankVotes: ScoreSaberRankingRequestVotesTokenSchema,
  totalQATVotes: ScoreSaberRankingRequestVotesTokenSchema,
  difficultyCount: Type.Number(),
});

export type RankingRequestToken = StaticDecode<typeof RankingRequestTokenSchema>;
