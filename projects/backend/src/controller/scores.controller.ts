import { Controller, Get } from "elysia-decorators";
import { NotFoundError, t } from "elysia";
import { Leaderboards } from "@ssr/common/leaderboard";
import { TopScoresResponse } from "@ssr/common/response/top-scores-response";
import { ScoreService } from "../service/score.service";
import { Timeframe } from "@ssr/common/timeframe";

@Controller("/scores")
export default class ScoresController {
  @Get("/player/:leaderboard/:id/:page/:sort", {
    config: {},
    params: t.Object({
      leaderboard: t.String({ required: true }),
      id: t.String({ required: true }),
      page: t.Number({ required: true }),
      sort: t.String({ required: true }),
    }),
    query: t.Object({
      search: t.Optional(t.String()),
    }),
  })
  public async getScores({
    params: { leaderboard, id, page, sort },
    query: { search },
  }: {
    params: {
      leaderboard: Leaderboards;
      id: string;
      page: number;
      sort: string;
    };
    query: { search?: string };
  }): Promise<unknown> {
    return await ScoreService.lookupPlayerScores(leaderboard, id, page, sort, search);
  }

  @Get("/leaderboard/:leaderboard/:id/:page", {
    config: {},
    params: t.Object({
      leaderboard: t.String({ required: true }),
      id: t.String({ required: true }),
      page: t.Number({ required: true }),
    }),
    query: t.Object({
      country: t.Optional(t.String()),
    }),
  })
  public async getLeaderboardScores({
    params: { leaderboard, id, page },
    query: { country },
  }: {
    params: {
      leaderboard: Leaderboards;
      id: string;
      page: number;
    };
    query: { country?: string };
  }): Promise<unknown> {
    return await ScoreService.getLeaderboardScores(leaderboard, id, page, country);
  }

  @Get("/history/:playerId/:leaderboardId/:page", {
    config: {},
    params: t.Object({
      playerId: t.String({ required: true }),
      leaderboardId: t.String({ required: true }),
      page: t.Number({ required: true }),
    }),
  })
  public async getScoreHistory({
    params: { playerId, leaderboardId, page },
  }: {
    params: {
      playerId: string;
      leaderboardId: string;
      page: number;
    };
  }): Promise<unknown> {
    return (await ScoreService.getScoreHistory(playerId, leaderboardId, page)).toJSON();
  }

  @Get("/top", {
    config: {},
    query: t.Object({
      limit: t.Number({ required: true }),
      timeframe: t.String({ required: true }),
    }),
  })
  public async getTopScores({
    query: { limit, timeframe },
  }: {
    query: { limit: number; timeframe: Timeframe };
  }): Promise<TopScoresResponse> {
    if (limit <= 0) {
      limit = 1;
    } else if (limit > 100) {
      limit = 100;
    }
    if (!["daily", "weekly", "monthly"].includes(timeframe)) {
      timeframe = "daily";
    }

    const scores = await ScoreService.getTopScores(limit, timeframe);
    return {
      scores,
      timeframe,
      limit,
    };
  }

  @Get("/friends/:leaderboardId/:page", {
    config: {},
    params: t.Object({
      leaderboardId: t.Number({ required: true }),
      page: t.Number({ required: true }),
    }),
    query: t.Object({
      friendIds: t.String({ required: true }),
    }),
  })
  public async getFriendScores({
    params: { leaderboardId, page },
    query: { friendIds },
  }: {
    params: {
      leaderboardId: number;
      page: number;
    };
    query: { friendIds: string };
  }): Promise<unknown> {
    const ids = friendIds.split(",");
    if (ids.length === 0) {
      // todo: proper error
      throw new NotFoundError("Malformed friend ids, must be a comma separated list of friend ids");
    }
    return (await ScoreService.getFriendScores(ids, leaderboardId, page)).toJSON();
  }
}
