import { PlayerScoresResponse } from "@ssr/common/response/player-scores-response";
import { ScoreQuery, SortDirection, SortField } from "@ssr/common/types/score-query";
import { t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import { SuperJSON } from "superjson";
import { LeaderboardScoresService } from "../service/leaderboard/leaderboard-scores.service";
import { PlayerScoresService } from "../service/player/player-scores.service";

@Controller("/scores")
export default class ScoresController {
  @Get("/player/scoresaber/:id/:page/:sort", {
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
      await PlayerScoresService.getScoreSaberLivePlayerScores(id, page, sort, search, comparisonPlayerId)
    ).toJSON();
  }

  @Get("/player/:mode/:id/:field/:direction/:page", {
    config: {},
    tags: ["Scores"],
    params: t.Object({
      mode: t.String({ required: true }),
      id: t.String({ required: true }),
      field: t.String({ required: true }),
      direction: t.String({ required: true }),
      page: t.Number({ required: true }),
    }),
    query: t.Optional(
      t.Object({
        search: t.Optional(t.String()),
        hmd: t.Optional(t.String()),
      })
    ),
    detail: {
      description: "Lookup scores for a player",
    },
  })
  public async getSSRScores({
    params: { mode, id, page, field, direction },
    query,
  }: {
    params: {
      mode: "ssr" | "medals";
      id: string;
      field: SortField;
      direction: SortDirection;
      page: number;
    };
    query: ScoreQuery;
  }): Promise<PlayerScoresResponse> {
    return (await PlayerScoresService.getPlayerScores(mode, id, page, field, direction, query)).toJSON();
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
    return await LeaderboardScoresService.getLeaderboardScores(id, page, country);
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
    const score = await PlayerScoresService.getScore(id);
    return superJson ? SuperJSON.stringify(score) : score;
  }
}
