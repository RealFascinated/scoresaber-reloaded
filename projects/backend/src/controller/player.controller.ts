import { DetailType } from "@ssr/common/detail-type";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerRankedPpsResponse } from "@ssr/common/response/player-ranked-pps-response";
import { PlayerSearchResponse } from "@ssr/common/response/player-search-response";
import { PpBoundaryResponse } from "@ssr/common/response/pp-boundary-response";
import { t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import SuperJSON from "superjson";
import { PlayerService } from "../service/player.service";
import ScoreSaberService from "../service/scoresaber/scoresaber.service";

@Controller("/player")
export default class PlayerController {
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

  @Get("/maps-graph/:id", {
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
