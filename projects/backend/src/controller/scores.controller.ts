import { Controller, Get } from "elysia-decorators";
import { t } from "elysia";
import { Leaderboards } from "@ssr/common/leaderboard";
import { ScoreService } from "../service/score.service";
import { ScoreSortType } from "@ssr/common/sorter/sort-type";
import { SortDirection } from "@ssr/common/sorter/sort-direction";

@Controller("/scores")
export default class ScoresController {
  @Get("/player/:leaderboard/:id/:page/:sort/:direction", {
    config: {},
    params: t.Object({
      leaderboard: t.String({ required: true }),
      id: t.String({ required: true }),
      page: t.Number({ required: true }),
      sort: t.String({ required: true }),
      direction: t.String({ required: true }),
    }),
    query: t.Object({
      search: t.Optional(t.String()),
    }),
  })
  public async getScores({
    params: { leaderboard, id, page, sort, direction },
    query: { search },
  }: {
    params: {
      leaderboard: Leaderboards;
      id: string;
      page: number;
      sort: ScoreSortType;
      direction: SortDirection;
    };
    query: { search?: string };
  }): Promise<unknown> {
    return await ScoreService.getPlayerScores(leaderboard, id, page, sort, direction, search);
  }

  @Get("/leaderboard/:leaderboard/:id/:page", {
    config: {},
    params: t.Object({
      leaderboard: t.String({ required: true }),
      id: t.String({ required: true }),
      page: t.Number({ required: true }),
    }),
  })
  public async getLeaderboardScores({
    params: { leaderboard, id, page },
  }: {
    params: {
      leaderboard: Leaderboards;
      id: string;
      page: number;
    };
    query: { search?: string };
  }): Promise<unknown> {
    return await ScoreService.getLeaderboardScores(leaderboard, id, page);
  }
}
