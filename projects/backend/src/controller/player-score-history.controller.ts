import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { Page } from "@ssr/common/pagination";
import { t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import { PlayerScoreHistoryService } from "../service/player/player-score-history.service";

@Controller("")
export default class PlayerScoreHistoryController {
  @Get("/player/score-history/:playerId/:leaderboardId/:page", {
    config: {},
    tags: ["Player"],
    params: t.Object({
      playerId: t.String({ required: true }),
      leaderboardId: t.String({ required: true }),
      page: t.Number({ required: true }),
    }),
    detail: {
      description: "Fetch a player's score history for a leaderboard",
    },
  })
  public async getScoreHistory({
    params: { playerId, leaderboardId, page },
  }: {
    params: {
      playerId: string;
      leaderboardId: string;
      page: number;
    };
  }): Promise<Page<ScoreSaberScore>> {
    return await PlayerScoreHistoryService.getPlayerScoreHistory(playerId, leaderboardId, page);
  }
}
