import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { DetailType } from "@ssr/common/detail-type";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerStatisticHistory } from "@ssr/common/player/player-statistic-history";
import { AroundPlayerResponse } from "@ssr/common/response/around-player-response";
import { PlayerRankedPpsResponse } from "@ssr/common/response/player-ranked-pps-response";
import { PpBoundaryResponse } from "@ssr/common/response/pp-boundary-response";
import { ScoreCalendarData } from "@ssr/common/types/player/player-statistic";
import { getDaysAgoDate } from "@ssr/common/utils/time-utils";
import { t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import SuperJSON from "superjson";
import { PlayerHistoryService } from "../service/player/player-history.service";
import { PlayerService } from "../service/player/player.service";
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
      type: t.Optional(t.Union([t.Literal("full"), t.Literal("basic")], { default: "basic" })),
      superJson: t.Optional(t.Boolean({ default: false })),
    }),
  })
  public async getPlayer({
    params: { id },
    query: { type, superJson },
  }: {
    params: { id: string };
    query: { type: DetailType; superJson: boolean };
  }): Promise<ScoreSaberPlayer | string> {
    const player = await ScoreSaberService.getPlayer(id, type);
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
    const player = await ApiServiceRegistry.getInstance().getScoreSaberService().lookupPlayer(id);
    if (!player) {
      throw new NotFoundError(`Player "${id}" not found`);
    }
    return await PlayerHistoryService.getPlayerStatisticHistory(
      player,
      new Date(startDate),
      new Date(endDate)
    );
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
      players: await ScoreSaberService.getPlayersAroundPlayer(id, type),
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
      boundaries: await PlayerService.getPlayerPpBoundary(id, boundary),
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
  }): Promise<ScoreCalendarData> {
    return await PlayerService.generateScoreCalendar(id, year, month);
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
    const data = await PlayerService.getPlayerScoreChart(id);
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
    return await PlayerService.getPlayerRankedPps(id);
  }
}
