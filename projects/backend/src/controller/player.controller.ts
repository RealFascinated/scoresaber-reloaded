import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { DetailType } from "@ssr/common/detail-type";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerStatisticHistory } from "@ssr/common/player/player-statistic-history";
import { PlayerTrackedSince } from "@ssr/common/player/player-tracked-since";
import { AroundPlayerResponse } from "@ssr/common/response/around-player-response";
import { PlayedMapsCalendarResponse } from "@ssr/common/response/played-maps-calendar-response";
import { PlayerRankedPpsResponse } from "@ssr/common/response/player-ranked-pps-response";
import { PpBoundaryResponse } from "@ssr/common/response/pp-boundary-response";
import { getDaysAgoDate } from "@ssr/common/utils/time-utils";
import { NotFoundError, t } from "elysia";
import { Controller, Get, Post } from "elysia-decorators";
import SuperJSON from "superjson";
import { PlayerAccuracyService } from "../service/player/player-accuracy.service";
import { PlayerCoreService } from "../service/player/player-core.service";
import { PlayerHistoryService } from "../service/player/player-history.service";
import { PlayerRankingService } from "../service/player/player-ranking.service";
import ScoreSaberService from "../service/scoresaber/scoresaber.service";

@Controller("/player")
export default class PlayerController {
  @Get("/:id", {
    config: {},
    tags: ["player"],
    params: t.Object({
      id: t.String({ required: true }),
    }),
    query: t.Object({
      createIfMissing: t.Optional(t.Boolean({ default: false })),
      type: t.Optional(t.Union([t.Literal("full"), t.Literal("basic")], { default: "basic" })),
      superJson: t.Optional(t.Boolean({ default: false })),
    }),
  })
  public async getPlayer({
    params: { id },
    query: { createIfMissing, type, superJson },
  }: {
    params: { id: string };
    query: { createIfMissing: boolean; type: DetailType; superJson: boolean };
  }): Promise<ScoreSaberPlayer | string> {
    const player = await ScoreSaberService.getPlayer(id, type, {
      createIfMissing,
    });
    return superJson ? SuperJSON.stringify(player) : player;
  }

  @Get("/history/:id", {
    config: {},
    tags: ["player"],
    params: t.Object({
      id: t.String({ required: true }),
    }),
    query: t.Object({
      startDate: t.Optional(t.String({ default: new Date().toISOString() })),
      endDate: t.Optional(t.String({ default: getDaysAgoDate(50).toISOString() })),
    }),
  })
  public async getPlayerHistory({
    params: { id },
    query: { startDate, endDate },
  }: {
    params: { id: string };
    query: { startDate: string; endDate: string };
  }): Promise<PlayerStatisticHistory> {
    const player = await ApiServiceRegistry.getScoreSaberService().lookupPlayer(id);
    if (!player) {
      throw new NotFoundError(`Player "${id}" not found`);
    }
    return await PlayerHistoryService.getPlayerStatisticHistory(
      player,
      new Date(startDate),
      new Date(endDate)
    );
  }

  @Post("/track/:id", {
    config: {},
    tags: ["player"],
    params: t.Object({
      id: t.String({ required: true }),
    }),
  })
  public async trackPlayer({
    params: { id },
  }: {
    params: { id: string };
  }): Promise<{ success: boolean }> {
    return { success: await PlayerCoreService.trackPlayer(id) };
  }

  @Get("/tracked/:id", {
    config: {},
    tags: ["player"],
    params: t.Object({
      id: t.String({ required: true }),
    }),
  })
  public async getTrackedStatus({
    params: { id },
    query: { createIfMissing },
  }: {
    params: { id: string };
    query: { createIfMissing: boolean };
  }): Promise<PlayerTrackedSince> {
    try {
      const player = await PlayerCoreService.getPlayer(id, createIfMissing);
      return {
        tracked: true,
        daysTracked: player.getDaysTracked(),
      };
    } catch {
      return {
        tracked: false,
      };
    }
  }

  @Get("/around/:id/:type", {
    config: {},
    tags: ["player"],
    params: t.Object({
      id: t.String({ required: true }),
      type: t.String({ required: true }),
    }),
  })
  public async getPlayersAround({
    params: { id, type },
  }: {
    params: { id: string; type: "global" | "country" };
  }): Promise<AroundPlayerResponse> {
    return {
      players: await PlayerRankingService.getPlayersAroundPlayer(id, type),
    };
  }

  @Get("/pp-boundary/:id/:boundary", {
    config: {},
    tags: ["player"],
    params: t.Object({
      id: t.String({ required: true }),
      boundary: t.Number({ maximum: 100, minimum: 1 }),
    }),
  })
  public async getPpBoundary({
    params: { id, boundary },
  }: {
    params: { id: string; boundary: number };
  }): Promise<PpBoundaryResponse> {
    return {
      boundaries: await PlayerRankingService.getPlayerPpBoundary(id, boundary),
      boundary: boundary,
    };
  }

  @Get("/history/calendar/:id/:year/:month", {
    config: {},
    tags: ["player"],
    params: t.Object({
      id: t.String({ required: true }),
      year: t.Number({ required: true }),
      month: t.Number({ required: true }),
    }),
  })
  public async getScoreCalendar({
    params: { id, year, month },
  }: {
    params: { id: string; year: number; month: number };
  }): Promise<PlayedMapsCalendarResponse> {
    return await PlayerHistoryService.getScoreCalendar(id, year, month);
  }

  @Get("/score-chart/:id", {
    config: {},
    tags: ["scores"],
    params: t.Object({
      id: t.String({ required: true }),
    }),
    query: t.Object({
      superJson: t.Optional(t.Boolean({ default: false })),
    }),
  })
  public async getPlayerStarsChartData({
    params: { id },
    query: { superJson },
  }: {
    params: { id: string };
    query: { superJson: boolean };
  }): Promise<unknown> {
    const data = await PlayerAccuracyService.getPlayerScoreChart(id);
    return superJson ? SuperJSON.stringify(data) : data;
  }

  @Get("/ranked-pps/:id", {
    config: {},
    tags: ["player"],
    params: t.Object({
      id: t.String({ required: true }),
    }),
  })
  public async getPlayerRankedPps({
    params: { id },
  }: {
    params: { id: string };
  }): Promise<PlayerRankedPpsResponse> {
    return await PlayerRankingService.getPlayerRankedPps(id);
  }
}
