import { Type, type StaticDecode } from "@sinclair/typebox";
import { RankingRequestTokenSchema } from "../../scoresaber/tokens/v1/ranking-request-token";

export const ScoreSaberRankingRequestsResponseSchema = Type.Object({
  nextInQueue: Type.Array(RankingRequestTokenSchema),
  openRankUnrank: Type.Array(RankingRequestTokenSchema),
  all: Type.Array(RankingRequestTokenSchema),
});

export type ScoreSaberRankingRequestsResponse = StaticDecode<typeof ScoreSaberRankingRequestsResponseSchema>;
