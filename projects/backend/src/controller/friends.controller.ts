import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { Page } from "@ssr/common/pagination";
import { PlayerScoresResponse } from "@ssr/common/response/player-scores-response";
import { Elysia, t } from "elysia";
import { z } from "zod";
import { PlayerFriendScoresService } from "../service/player/player-friend-scores.service";

export default function friendsController(app: Elysia) {
  return app
    .get(
      "/scores/friends/leaderboard/:leaderboardId/:page",
      async ({ params: { leaderboardId, page }, body: { friendIds } }): Promise<Page<ScoreSaberScore>> => {
        return await PlayerFriendScoresService.getFriendLeaderboardScores(friendIds, leaderboardId, page);
      },
      {
        tags: ["Friends"],
        params: t.Object({
          leaderboardId: t.Number({ required: true }),
          page: t.Number({ required: true }),
        }),
        body: z.object({
          friendIds: z.array(z.string()),
        }),
        detail: {
          description: "Fetch friend leaderboard scores for a player",
        },
      }
    )
    .get(
      "/scores/friends/:page",
      async ({ params: { page }, body: { friendIds } }): Promise<PlayerScoresResponse> => {
        return await PlayerFriendScoresService.getFriendScores(friendIds, page);
      },
      {
        tags: ["Friends"],
        params: t.Object({
          page: t.Number({ required: true }),
        }),
        body: z.object({
          friendIds: z.array(z.string()),
        }),
        detail: {
          description: "Fetch friend scores for a player",
        },
      }
    );
}
