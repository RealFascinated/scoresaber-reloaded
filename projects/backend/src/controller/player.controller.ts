import { Controller, Get } from "elysia-decorators";
import { PlayerService } from "../service/player.service";
import { t } from "elysia";
import { PlayerHistory } from "@ssr/common/player/player-history";
import { PlayerTrackedSince } from "@ssr/common/player/player-tracked-since";
import { AroundPlayerResponse } from "@ssr/common/response/around-player-response";
import { PpBoundaryResponse } from "@ssr/common/response/pp-boundary-response";
import { PlayedMapsCalendarResponse } from "@ssr/common/response/played-maps-calendar-response";
import SuperJSON from "superjson";
import ScoreSaberService from "../service/scoresaber.service";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";

@Controller("/player")
export default class PlayerController {
  @Get("/:id", {
    config: {},
    params: t.Object({
      id: t.String({ required: true }),
    }),
    query: t.Object({
      createIfMissing: t.Boolean({ default: false, required: false }),
      superJson: t.Boolean({ default: false, required: false }),
    }),
  })
  public async getPlayer({
    params: { id },
    query: { createIfMissing, superJson },
  }: {
    params: { id: string };
    query: { createIfMissing: boolean; superJson: boolean };
  }): Promise<ScoreSaberPlayer | string> {
    const player = await ScoreSaberService.getPlayer(id, createIfMissing);
    return superJson ? SuperJSON.stringify(player) : player;
  }

  @Get("/track/:id", {
    config: {},
    params: t.Object({
      id: t.String({ required: true }),
    }),
  })
  public async trackPlayer({ params: { id } }: { params: { id: string } }): Promise<{ success: boolean }> {
    return { success: await PlayerService.trackPlayer(id) };
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
      players: await PlayerService.getPlayersAroundPlayer(id, type),
    };
  }

  @Get("/pp-boundary/:id/:boundary", {
    config: {},
    params: t.Object({
      id: t.String({ required: true }),
      boundary: t.Number({ maximum: 50, minimum: 1 }),
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
  }): Promise<PlayedMapsCalendarResponse> {
    return await PlayerService.getScoreCalendar(id, year, month);
  }
}
