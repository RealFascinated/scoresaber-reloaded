import { Controller, Get } from "elysia-decorators";
import { t } from "elysia";
import LeaderboardService from "../service/leaderboard.service";
import SuperJSON from "superjson";
import { Swagger } from "../common/swagger";
import { MapDifficulty } from "@ssr/common/score/map-difficulty";
import { MapCharacteristic } from "@ssr/common/types/map-characteristic";

@Controller("/leaderboard")
export default class LeaderboardController {
  @Get("/by-id/:id", {
    config: {},
    tags: ["leaderboard"],
    params: t.Object({
      id: t.String({ required: true }),
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
  }: {
    params: {
      id: string;
    };
  }): Promise<unknown> {
    return SuperJSON.stringify(await LeaderboardService.getLeaderboard(id));
  }

  @Get("/by-hash/:id/:difficulty/:characteristic", {
    config: {},
    tags: ["leaderboard"],
    params: t.Object({
      id: t.String({ required: true }),
      difficulty: t.String({ required: true }),
      characteristic: t.String({ required: true }),
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
  }: {
    params: {
      id: string;
      difficulty: MapDifficulty;
      characteristic: MapCharacteristic;
    };
  }): Promise<unknown> {
    return SuperJSON.stringify(await LeaderboardService.getLeaderboardByHash(id, difficulty, characteristic));
  }
}
