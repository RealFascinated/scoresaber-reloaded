import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { DetailType } from "@ssr/common/detail-type";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerStatisticHistory } from "@ssr/common/player/player-statistic-history";
import { PlayerRankedPpsResponse } from "@ssr/common/response/player-ranked-pps-response";
import { PlayerSearchResponse } from "@ssr/common/response/player-search-response";
import { PpBoundaryResponse } from "@ssr/common/response/pp-boundary-response";
import { ScoreCalendarData } from "@ssr/common/types/player/player-statistic";
import { getDaysAgoDate } from "@ssr/common/utils/time-utils";
import { t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import SuperJSON from "superjson";
import { PlayerService } from "../service/player.service";
import ScoreSaberService from "../service/scoresaber/scoresaber.service";

@Controller("/scoresaber")
export default class ScoreSaberController {
  @Get("/:id", {
    config: {},
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
    params: t.Object({
      id: t.String({ required: true }),
    }),
    query: t.Object({
      startDate: t.Optional(t.String({ default: new Date().toISOString() })),
      endDate: t.Optional(t.String({ default: getDaysAgoDate(50).toISOString() })),
      includeFields: t.Optional(t.String({ default: "" })),
    }),
  })
  public async getPlayerHistory({
    params: { id },
    query: { startDate, endDate, includeFields },
  }: {
    params: { id: string };
    query: { startDate: string; endDate: string; includeFields: string };
  }): Promise<PlayerStatisticHistory> {
    const player = await ApiServiceRegistry.getInstance().getScoreSaberService().lookupPlayer(id);
    if (!player) {
      throw new NotFoundError(`Player "${id}" not found`);
    }

    const projection =
      includeFields !== ""
        ? includeFields.split(",").reduce(
            (acc, field) => {
              acc[field] = 1;
              return acc;
            },
            {} as Record<string, string | number | boolean | object>
          )
        : undefined;

    return await PlayerService.getPlayerStatisticHistory(
      player,
      new Date(startDate),
      new Date(endDate),
      projection
    );
  }

  @Get("/pp-boundary/:id/:boundary", {
    config: {},
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

  @Get("/search", {
    config: {},
    query: t.Object({
      superJson: t.Optional(t.Boolean({ default: false })),
      query: t.Optional(t.String({ default: "" })),
    }),
  })
  public async searchPlayers({
    query: { superJson, query },
  }: {
    query: { superJson: boolean; query: string };
  }): Promise<PlayerSearchResponse | unknown> {
    const players = {
      players: await PlayerService.searchPlayers(query),
    };
    return superJson ? SuperJSON.stringify(players) : players;
  }
}
