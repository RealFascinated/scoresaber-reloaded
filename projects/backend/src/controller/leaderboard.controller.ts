import { Controller, Get } from "elysia-decorators";
import { t } from "elysia";
import { Leaderboards } from "@ssr/common/leaderboard";
import LeaderboardService from "../service/leaderboard.service";
import SuperJSON from "superjson";
import { Swagger } from "../common/swagger";

@Controller("/leaderboard")
export default class LeaderboardController {
  @Get("/:leaderboard/:id", {
    config: {},
    tags: ["leaderboard"],
    params: t.Object({
      id: t.String({ required: true }),
      leaderboard: t.String({ required: true }),
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
    params: { leaderboard, id },
  }: {
    params: {
      leaderboard: Leaderboards;
      id: string;
    };
  }): Promise<unknown> {
    return SuperJSON.stringify(await LeaderboardService.getLeaderboard(leaderboard, id));
  }

  @Get("/ranked", {
    config: {},
    tags: ["leaderboard"],
    detail: {
      responses: {
        200: {
          description: "The ranked leaderboards.",
        },
      },
      description: "Fetches all ranked leaderboards on ScoreSaber.",
    },
  })
  public async getRankedLeaderboards(): Promise<unknown> {
    return SuperJSON.stringify(await LeaderboardService.getRankedLeaderboards());
  }
}
