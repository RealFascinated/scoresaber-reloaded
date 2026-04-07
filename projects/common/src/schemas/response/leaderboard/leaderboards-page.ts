import { z } from "zod";
import { PaginationMetadataSchema } from "../../pagination";
import { ScoreSaberLeaderboardSchema } from "../../scoresaber/leaderboard/leaderboard";

export const LeaderboardsPageResponseSchema = z.object({
  items: z.array(ScoreSaberLeaderboardSchema),
  metadata: PaginationMetadataSchema,
});

export type LeaderboardsPageResponse = z.infer<typeof LeaderboardsPageResponseSchema>;
