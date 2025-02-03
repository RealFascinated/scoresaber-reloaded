import { Controller, Get } from "elysia-decorators";
import { t } from "elysia";
import LeaderboardService from "../service/leaderboard.service";
import SuperJSON from "superjson";
import { Swagger } from "../common/swagger";
import { MapDifficulty } from "@ssr/common/score/map-difficulty";
import { MapCharacteristic } from "@ssr/common/types/map-characteristic";
import { DetailType } from "@ssr/common/detail-type";

@Controller("/leaderboard")
export default class LeaderboardController {
  @Get("/by-id/:id", {
    config: {},
    params: t.Object({
      id: t.String({ required: true }),
    }),
    query: t.Object({
      type: t.Optional(t.Union([t.Literal("basic"), t.Literal("full")], { default: "basic" })),
    }),
    detail: {
      responses: {
        200: {
          description: "The leaderboard.",
        },
        ...Swagger.responses.leaderboardNotFound,
      },
      description: "Lookup a leaderboard",
    },
  })
  public async getLeaderboard({
    params: { id },
    query: { type },
  }: {
    params: {
      id: string;
    };
    query: { type: DetailType };
  }): Promise<unknown> {
    return SuperJSON.stringify(await LeaderboardService.getLeaderboard(id, { type, includeBeatSaver: true }));
  }

  @Get("/by-hash/:id/:difficulty/:characteristic", {
    config: {},
    params: t.Object({
      id: t.String({ required: true }),
      difficulty: t.String({ required: true }),
      characteristic: t.String({ required: true }),
    }),
    query: t.Object({
      type: t.Optional(t.Union([t.Literal("basic"), t.Literal("full")], { default: "basic" })),
    }),
    detail: {
      responses: {
        200: {
          description: "The leaderboard.",
        },
        ...Swagger.responses.leaderboardNotFound,
      },
      description: "Lookup a leaderboard",
    },
  })
  public async getLeaderboardByHash({
    params: { id, difficulty, characteristic },
    query: { type },
  }: {
    params: {
      id: string;
      difficulty: MapDifficulty;
      characteristic: MapCharacteristic;
      };
    query: { type: DetailType };
  }): Promise<unknown> {
    return SuperJSON.stringify(
      await LeaderboardService.getLeaderboardByHash(id, difficulty, characteristic, { type, includeBeatSaver: true })
    );
  }
}
