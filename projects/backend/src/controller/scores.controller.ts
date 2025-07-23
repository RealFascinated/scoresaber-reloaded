import { t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import { SuperJSON } from "superjson";
import { PlayerService } from "../service/player/player.service";
import { ScoreService } from "../service/score/score.service";

@Controller("/scores")
export default class ScoresController {
  @Get("/player/:id/:page/:sort", {
    config: {},
    tags: ["Scores"],
    params: t.Object({
      id: t.String({ required: true }),
      page: t.Number({ required: true }),
      sort: t.String({ required: true }),
    }),
    query: t.Object({
      search: t.Optional(t.String()),
      comparisonPlayerId: t.Optional(t.String()),
    }),
    detail: {
      description: "Fetch a player's scores",
    },
  })
  public async getScores({
    params: { id, page, sort },
    query: { search, comparisonPlayerId },
  }: {
    params: {
      id: string;
      page: number;
      sort: string;
    };
    query: { search?: string; comparisonPlayerId?: string };
  }): Promise<unknown> {
    return (
      await PlayerService.getScoreSaberLivePlayerScores(id, page, sort, search, comparisonPlayerId)
    ).toJSON();
  }

  @Get("/leaderboard/:id/:page", {
    config: {},
    tags: ["Scores"],
    params: t.Object({
      id: t.String({ required: true }),
      page: t.Number({ required: true }),
    }),
    query: t.Object({
      country: t.Optional(t.String()),
    }),
    detail: {
      description: "Fetch the scores for a leaderboard",
    },
  })
  public async getLeaderboardScores({
    params: { id, page },
    query: { country },
  }: {
    params: {
      id: string;
      page: number;
    };
    query: { country?: string };
  }): Promise<unknown> {
    return await ScoreService.getLeaderboardScores(id, page, country);
  }

  @Get("/:id", {
    config: {},
    tags: ["Scores"],
    params: t.Object({
      id: t.String({ required: true }),
    }),
    query: t.Object({
      superJson: t.Optional(t.Boolean()),
    }),
    detail: {
      description: "Fetch a score by its ID",
    },
  })
  public async getScore({
    params: { id },
    query: { superJson },
  }: {
    params: { id: string };
    query: { superJson?: boolean };
  }): Promise<unknown> {
    const score = await PlayerService.getScore(id);
    return superJson ? SuperJSON.stringify(score) : score;
  }
}
