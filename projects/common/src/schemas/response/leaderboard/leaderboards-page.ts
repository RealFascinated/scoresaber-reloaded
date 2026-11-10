import { Type, type StaticDecode } from "typebox";
import { PaginationMetadataSchema } from "../../pagination";
import { ScoreSaberLeaderboardSchema } from "../../scoresaber/leaderboard/leaderboard";

export const LeaderboardsPageResponseSchema = Type.Object({
  items: Type.Array(ScoreSaberLeaderboardSchema),
  metadata: PaginationMetadataSchema,
});

export type LeaderboardsPageResponse = StaticDecode<typeof LeaderboardsPageResponseSchema>;
