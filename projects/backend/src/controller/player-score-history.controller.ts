import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { Page } from "@ssr/common/pagination";
import { Elysia, t } from "elysia";
import { PlayerScoreHistoryService } from "../service/player/player-score-history.service";

export default function playerScoreHistoryController(app: Elysia) {
  return app.get(
    "/player/score-history/:playerId/:leaderboardId/:page",
    async ({ params: { playerId, leaderboardId, page } }): Promise<Page<ScoreSaberScore>> => {
      return await PlayerScoreHistoryService.getPlayerScoreHistory(playerId, leaderboardId, page);
    },
    {
      tags: ["Player"],
      params: t.Object({
        playerId: t.String({ required: true }),
        leaderboardId: t.String({ required: true }),
        page: t.Number({ required: true }),
      }),
      detail: {
        description: "Fetch a player's score history for a leaderboard",
      },
    }
  );
}
