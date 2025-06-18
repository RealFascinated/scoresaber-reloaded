import { t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import { SuperJSON } from "superjson";
import { ScoreHistoryService } from "../service/score/score-history.service";

@Controller("")
export default class PlayerScoreHistoryController {
  @Get("/player/score-history/:playerId/:leaderboardId/:page", {
    config: {},
    params: t.Object({
      playerId: t.String({ required: true }),
      leaderboardId: t.String({ required: true }),
      page: t.Number({ required: true }),
    }),
    query: t.Object({
      superJson: t.Optional(t.Boolean({ default: false })),
    }),
  })
  public async getScoreHistory({
    params: { playerId, leaderboardId, page },
    query: { superJson },
  }: {
    params: {
      playerId: string;
      leaderboardId: string;
      page: number;
    };
    query: { superJson: boolean };
  }): Promise<unknown> {
    const data = await ScoreHistoryService.getScoreHistory(playerId, leaderboardId, page);
    return superJson ? SuperJSON.stringify(data) : data.toJSON();
  }

  @Get("/player/score-history-graph/:playerId/:leaderboardId", {
    config: {},
    params: t.Object({
      playerId: t.String({ required: true }),
      leaderboardId: t.String({ required: true }),
    }),
    query: t.Object({
      superJson: t.Optional(t.Boolean({ default: false })),
    }),
  })
  public async getScoreHistoryGraph({
    params: { playerId, leaderboardId },
    query: { superJson },
  }: {
    params: { playerId: string; leaderboardId: string };
    query: { superJson: boolean };
  }): Promise<unknown> {
    const data = await ScoreHistoryService.getScoreHistoryGraph(playerId, leaderboardId);
    return superJson ? SuperJSON.stringify(data) : data;
  }
}
