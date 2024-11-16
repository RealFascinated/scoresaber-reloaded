import { Controller, Get } from "elysia-decorators";
import { t } from "elysia";
import { Leaderboards } from "@ssr/common/leaderboard";
import LeaderboardService from "../service/leaderboard.service";
import SuperJSON from "superjson";

@Controller("/leaderboard")
export default class LeaderboardController {
  @Get("/:leaderboard/:id", {
    config: {},
    params: t.Object({
      id: t.String({ required: true }),
      leaderboard: t.String({ required: true }),
    }),
  })
  public async getLeaderboard({
    params: { leaderboard, id },
  }: {
    params: {
      leaderboard: Leaderboards;
      id: string;
      page: number;
    };
  }): Promise<unknown> {
    return SuperJSON.stringify(await LeaderboardService.getLeaderboard(leaderboard, id));
  }
}
