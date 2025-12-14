import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { Page } from "@ssr/common/pagination";
import { Elysia } from "elysia";
import { z } from "zod";
import { PlayerScoreHistoryService } from "../service/player/player-score-history.service";

export default function playerScoreHistoryController(app: Elysia) {
  return app.get(
    "/player/score-history/:playerId/:leaderboardId/:page",
    async ({ params: { playerId, leaderboardId, page } }): Promise<Page<ScoreSaberScore>> => {
      return await PlayerScoreHistoryService.getPlayerScoreHistory(playerId, leaderboardId, page);
    },
    {
      tags: ["Player"],
      params: z.object({
        playerId: z.string(),
        leaderboardId: z.string(),
        page: z.coerce.number(),
      }),
      detail: {
        description: "Fetch a player's score history for a leaderboard",
      },
    }
  );
}
