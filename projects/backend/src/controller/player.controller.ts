import { DetailType } from "@ssr/common/detail-type";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerRankedPpsResponse } from "@ssr/common/response/player-ranked-pps-response";
import { PpBoundaryResponse } from "@ssr/common/response/pp-boundary-response";
import { t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import SuperJSON from "superjson";
import { PlayerService } from "../service/player/player.service";
import ScoreSaberService from "../service/scoresaber.service";

@Controller("/player")
export default class PlayerController {
  @Get("/:id", {
    config: {},
    tags: ["Player"],
    params: t.Object({
      id: t.String({ required: true }),
    }),
    query: t.Object({
      type: t.Optional(t.Union([t.Literal("full"), t.Literal("basic")], { default: "basic" })),
      superJson: t.Optional(t.Boolean({ default: false })),
    }),
    detail: {
      description: "Fetch a player by their id",
    },
  })
  public async getPlayer({
    params: { id },
    query: { type, superJson },
  }: {
    params: { id: string };
    query: { type: DetailType; superJson: boolean };
  }): Promise<ScoreSaberPlayer | string> {
    const player = await ScoreSaberService.getPlayer(id, type, undefined, {
      setMedalsRank: true,
      setInactivesRank: true,
      getHmdBreakdown: true,
    });
    return superJson ? SuperJSON.stringify(player) : player;
  }

  @Get("/pp-boundary/:id/:boundary", {
    config: {},
    tags: ["Player"],
    params: t.Object({
      id: t.String({ required: true }),
      boundary: t.Number({ maximum: 100, minimum: 1 }),
    }),
    detail: {
      description: "Fetch the player's pp boundary for a given boundary amount",
    },
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
    tags: ["Player"],
    params: t.Object({
      id: t.String({ required: true }),
    }),
    query: t.Object({
      superJson: t.Optional(t.Boolean({ default: false })),
    }),
    detail: {
      description: "Fetch a player's scores chart data",
    },
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
    tags: ["Player"],
    params: t.Object({
      id: t.String({ required: true }),
    }),
    detail: {
      description: "Fetch a player's ranked pps",
    },
  })
  public async getPlayerRankedPps({
    params: { id },
  }: {
    params: { id: string };
  }): Promise<PlayerRankedPpsResponse> {
    return await PlayerService.getPlayerRankedPps(id);
  }

  @Get("/refresh/:id", {
    config: {},
    tags: ["Player"],
    params: t.Object({
      id: t.String({ required: true }),
    }),
    detail: {
      description: "Refresh a player's for ScoreSaber and update their avatar",
    },
  })
  public async refreshPlayer({ params: { id } }: { params: { id: string } }) {
    return await PlayerService.refreshPlayer(id);
  }
}
