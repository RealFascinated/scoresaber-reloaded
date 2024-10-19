import { Controller, Get } from "elysia-decorators";
import { PlayerService } from "../service/player.service";
import { t } from "elysia";
import { PlayerHistory } from "@ssr/common/player/player-history";
import { PlayerTrackedSince } from "@ssr/common/player/player-tracked-since";
import { AroundPlayerResponse } from "@ssr/common/response/around-player-response";

@Controller("/player")
export default class PlayerController {
  @Get("/history/:id", {
    config: {},
    params: t.Object({
      id: t.String({ required: true }),
    }),
    query: t.Object({
      createIfMissing: t.Boolean({ default: false, required: false }),
    }),
  })
  public async getPlayer({
    params: { id },
    query: { createIfMissing },
  }: {
    params: { id: string };
    query: { createIfMissing: boolean };
  }): Promise<{ statistics: Record<string, PlayerHistory> }> {
    const player = await PlayerService.getPlayer(id, createIfMissing);
    return { statistics: player.getHistoryPreviousDays(50) };
  }

  @Get("/tracked/:id", {
    config: {},
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
      const player = await PlayerService.getPlayer(id, createIfMissing);
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
      players: await PlayerService.getAround(id, type),
    };
  }
}
