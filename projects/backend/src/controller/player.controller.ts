import { Controller, Get, Post } from "elysia-decorators";
import { PlayerService } from "../service/player.service";
import { t } from "elysia";
import { PlayerTrackedSince } from "@ssr/common/player/player-tracked-since";
import { AroundPlayerResponse } from "@ssr/common/response/around-player-response";
import { PpBoundaryResponse } from "@ssr/common/response/pp-boundary-response";
import { PlayedMapsCalendarResponse } from "@ssr/common/response/played-maps-calendar-response";
import SuperJSON from "superjson";
import ScoreSaberService from "../service/scoresaber.service";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { Swagger } from "../common/swagger";

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
      superJson: t.Optional(t.Boolean({ default: false })),
    }),
    detail: {
      responses: {
        200: {
          description: "The player.",
        },
        ...Swagger.responses.playerNotFound,
      },
      description: "Lookup a player",
    },
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

  @Post("/track/:id", {
    config: {},
    tags: ["player"],
    params: t.Object({
      id: t.String({ required: true }),
    }),
    detail: {
      responses: {
        200: {
          description: "Player successfully tracked.",
        },
        ...Swagger.responses.playerNotFound,
      },
      description: "Track a new player.",
    },
  })
  public async trackPlayer({ params: { id } }: { params: { id: string } }): Promise<{ success: boolean }> {
    return { success: await PlayerService.trackPlayer(id) };
  }

  @Get("/tracked/:id", {
    config: {},
    tags: ["player"],
    params: t.Object({
      id: t.String({ required: true }),
    }),
    detail: {
      responses: {
        200: {
          description: "The tracked status of the player.",
        },
        ...Swagger.responses.playerNotFound,
      },
      description: "Lookup a player's tracked status.",
    },
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
    tags: ["player"],
    params: t.Object({
      id: t.String({ required: true }),
      type: t.String({ required: true }),
    }),
    detail: {
      responses: {
        200: {
          description: "The player's around another player.",
        },
        ...Swagger.responses.playerNotFound,
      },
      description: "Lookup player's around another player.",
    },
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
    tags: ["player"],
    params: t.Object({
      id: t.String({ required: true }),
      boundary: t.Number({ maximum: 50, minimum: 1 }),
    }),
    detail: {
      responses: {
        200: {
          description: "PP boundaries for a player.",
        },
        ...Swagger.responses.playerNotFound,
      },
      description: "Lookup a player's pp boundaries",
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

  @Get("/history/calendar/:id/:year/:month", {
    config: {},
    tags: ["player"],
    params: t.Object({
      id: t.String({ required: true }),
      year: t.Number({ required: true }),
      month: t.Number({ required: true }),
    }),
    detail: {
      responses: {
        200: {
          description: "The player's scores set calendar.",
        },
        ...Swagger.responses.playerNotFound,
      },
      description: "Lookup a player's calender",
    },
  })
  public async getScoreCalendar({
    params: { id, year, month },
  }: {
    params: { id: string; year: number; month: number };
  }): Promise<PlayedMapsCalendarResponse> {
    return await PlayerService.getScoreCalendar(id, year, month);
  }
}
