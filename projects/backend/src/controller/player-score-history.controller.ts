import { t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import { SuperJSON } from "superjson";
import { PlayerService } from "../service/player/player.service";

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
    query: t.Object({
      superJson: t.Optional(t.Boolean({ default: false })),
    }),
    detail: {
      description: "Fetch a player's score history for a leaderboard",
    },
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
    const data = await PlayerService.getPlayerScoreHistory(playerId, leaderboardId, page);
    return superJson ? SuperJSON.stringify(data) : data.toJSON();
  }

  @Get("/player/score-history-graph/:playerId/:leaderboardId", {
    config: {},
    tags: ["Player"],
    params: t.Object({
      playerId: t.String({ required: true }),
      leaderboardId: t.String({ required: true }),
    }),
    query: t.Object({
      superJson: t.Optional(t.Boolean({ default: false })),
    }),
    detail: {
      description: "Fetch a player's score history graph for a leaderboard",
    },
  })
  public async getScoreHistoryGraph({
    params: { playerId, leaderboardId },
    query: { superJson },
  }: {
    params: { playerId: string; leaderboardId: string };
    query: { superJson: boolean };
  }): Promise<unknown> {
    const data = await PlayerService.getPlayerScoreHistoryGraph(playerId, leaderboardId);
    return superJson ? SuperJSON.stringify(data) : data;
  }
}
