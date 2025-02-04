import { TopScoresResponse } from "@ssr/common/response/top-scores-response";
import { Timeframe } from "@ssr/common/timeframe";
import { NotFoundError, t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import BeatLeaderService from "../service/beatleader.service";
import SuperJSON from "superjson";
import { ScoreService } from "../service/score/score.service";
import { ScoreHistoryService } from "../service/score/score-history.service";
import { FriendScoresService } from "../service/score/friend-scores.service";
import ScoreSaberService from "../service/scoresaber.service";

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
    }),
    detail: {
      responses: {
        200: {
          description: "The scores for a player.",
        },
        404: {
          description: "The player or leaderboard was not found.",
        },
      },
      description: "Lookup a scores for a player",
    },
  })
  public async getScores({
    params: { id, page, sort },
    query: { search },
  }: {
    params: {
      id: string;
      page: number;
      sort: string;
    };
    query: { search?: string };
  }): Promise<unknown> {
    return await ScoreSaberService.lookupPlayerScores(id, page, sort, search);
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
    detail: {
      responses: {
        200: {
          description: "The scores for a leaderboard.",
        },
        404: {
          description: "The leaderboard was not found.",
        },
      },
      description: "Lookup a scores for a leaderboard",
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
    detail: {
      responses: {
        200: {
          description: "The score history for a player.",
        },
        404: {
          description: "The player or leaderboard was not found.",
        },
      },
      description: "Lookup a score history for a player",
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
    const data = await ScoreHistoryService.getScoreHistory(playerId, leaderboardId, page);
    return superJson ? SuperJSON.stringify(data) : data.toJSON();
  }

  @Get("/top", {
    config: {},
    tags: ["scores"],
    query: t.Object({
      limit: t.Number({ required: true }),
      timeframe: t.String({ required: true }),
    }),
    detail: {
      responses: {
        200: {
          description: "The top scores set based on a timeframe.",
        },
      },
      description: "Lookup the top scores set based on a timeframe",
    },
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
    if (!["daily", "weekly", "monthly", "all"].includes(timeframe)) {
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
    tags: ["scores"],
    params: t.Object({
      leaderboardId: t.Number({ required: true }),
      page: t.Number({ required: true }),
    }),
    query: t.Object({
      friendIds: t.String({ required: true }),
      superJson: t.Optional(t.Boolean({ default: false })),
    }),
    detail: {
      responses: {
        200: {
          description: "The scores set on a leaderboard for the given players.",
        },
        404: {
          description: "The player(s) or leaderboard was not found.",
        },
      },
      description: "Lookup scores for player(s) on a leaderboard",
    },
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
    detail: {
      responses: {
        200: {
          description: "The scores set on a leaderboard for the given players.",
        },
        404: {
          description: "The player(s) or leaderboard was not found.",
        },
      },
      description: "Lookup scores for player(s) on a leaderboard",
    },
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
    detail: {
      responses: {
        200: {
          description: "The score stats for a score.",
        },
        404: {
          description: "The score was not found.",
        },
      },
      description: "Lookup score stats for a score",
    },
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
}
