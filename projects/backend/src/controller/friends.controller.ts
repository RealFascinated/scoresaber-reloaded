import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { Page } from "@ssr/common/pagination";
import { PlayerScoresResponse } from "@ssr/common/response/player-scores-response";
import { Elysia } from "elysia";
import { z } from "zod";
import { PlayerFriendScoresService } from "../service/player/player-friend-scores.service";

export default function friendsController(app: Elysia) {
  return app
    .post(
      "/scores/friends/leaderboard/:leaderboardId/:page",
      async ({ params: { leaderboardId, page }, body: { friendIds } }): Promise<Page<ScoreSaberScore>> => {
        console.log("friendIds", friendIds);
        return await PlayerFriendScoresService.getFriendLeaderboardScores(friendIds, leaderboardId, page);
      },
      {
        tags: ["Friends"],
        params: z.object({
          leaderboardId: z.coerce.number(),
          page: z.coerce.number(),
        }),
        body: z.object({
          friendIds: z.array(z.string()),
        }),
        detail: {
          description: "Fetch friend leaderboard scores for a player",
        },
      }
    )
    .post(
      "/scores/friends/:page",
      async ({ params: { page }, body: { friendIds } }): Promise<PlayerScoresResponse> => {
        return await PlayerFriendScoresService.getFriendScores(friendIds, page);
      },
      {
        tags: ["Friends"],
        params: z.object({
          page: z.coerce.number(),
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
