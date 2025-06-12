import { Timeframe } from "@ssr/common/timeframe";
import { NotFoundError, t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import SuperJSON from "superjson";
import BeatLeaderService from "../service/beatleader.service";
import { FriendScoresService } from "../service/score/friend-scores.service";
import { ScoreHistoryService } from "../service/score/score-history.service";
import { ScoreService } from "../service/score/score.service";
import ScoreSaberService from "../service/scoresaber/scoresaber.service";

@Controller("/scores")
export default class ScoresController {
  @Get("/player/:id/:page/:sort", {
    config: {},
    tags: ["scores"],
    params: t.Object({
      id: t.String({ required: true }),
      page: t.Number({ required: true }),
      sort: t.String({ required: true }),
    }),
    query: t.Object({
      search: t.Optional(t.String()),
      comparisonPlayerId: t.Optional(t.String()),
    }),
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
      await ScoreSaberService.lookupPlayerScores(id, page, sort, search, comparisonPlayerId)
    ).toJSON();
  }

  @Get("/leaderboard/:id/:page", {
    config: {},
    tags: ["scores"],
    params: t.Object({
      id: t.String({ required: true }),
      page: t.Number({ required: true }),
    }),
    query: t.Object({
      country: t.Optional(t.String()),
    }),
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

  @Get("/history/:playerId/:leaderboardId/:page", {
    config: {},
    tags: ["scores"],
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

  @Get("/top/:timeframe/:page", {
    config: {},
    tags: ["scores"],
    params: t.Object({
      timeframe: t.String({ required: true, default: "daily" }),
      page: t.Number({ required: true, default: 1 }),
    }),
  })
  public async getTopScores({
    params: { timeframe, page },
  }: {
    params: { timeframe: Timeframe; page: number };
  }): Promise<unknown> {
    if (!["daily", "weekly", "monthly", "all"].includes(timeframe)) {
      timeframe = "daily";
    }

    return (await ScoreService.getTopScores(timeframe, page)).toJSON();
  }

  @Get("/friends/leaderboard/:leaderboardId/:page", {
    config: {},
    tags: ["scores"],
    params: t.Object({
      leaderboardId: t.Number({ required: true }),
      page: t.Number({ required: true }),
    }),
    query: t.Object({
      friendIds: t.String({ required: true }),
      superJson: t.Optional(t.Boolean({ default: false })),
    }),
  })
  public async getFriendLeaderboardScores({
    params: { leaderboardId, page },
    query: { friendIds, superJson },
  }: {
    params: {
      leaderboardId: number;
      page: number;
    };
    query: { friendIds: string; superJson: boolean };
  }): Promise<unknown> {
    const ids = friendIds.split(",");
    if (ids.length === 0) {
      throw new NotFoundError("Malformed friend ids, must be a comma separated list of friend ids");
    }
    const data = await FriendScoresService.getFriendLeaderboardScores(ids, leaderboardId, page);
    return superJson ? SuperJSON.stringify(data) : data.toJSON();
  }

  @Get("/friends/recent/:page", {
    config: {},
    tags: ["scores"],
    params: t.Object({
      page: t.Number({ required: true }),
    }),
    query: t.Object({
      friendIds: t.String({ required: true }),
      superJson: t.Optional(t.Boolean({ default: false })),
    }),
  })
  public async getFriendScores({
    params: { page },
    query: { friendIds, superJson },
  }: {
    params: {
      page: number;
    };
    query: { friendIds: string; superJson: boolean };
  }): Promise<unknown> {
    const ids = friendIds.split(",");
    if (ids.length === 0) {
      throw new NotFoundError("Malformed friend ids, must be a comma separated list of friend ids");
    }
    const data = await FriendScoresService.getFriendScores(ids, page);
    return superJson ? SuperJSON.stringify(data) : data.toJSON();
  }

  @Get("/scorestats/:id", {
    config: {},
    tags: ["scores"],
    params: t.Object({
      id: t.Number({ required: true }),
    }),
  })
  public async getScoreStats({
    params: { id },
  }: {
    params: {
      id: number;
    };
  }): Promise<unknown> {
    return {
      current: await BeatLeaderService.getScoreStats(id),
      previous: await BeatLeaderService.getPreviousScoreStats(id),
    };
  }

  @Get("/history-graph/:playerId/:leaderboardId", {
    config: {},
    tags: ["scores"],
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
