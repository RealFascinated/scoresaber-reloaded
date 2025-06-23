import { Timeframe } from "@ssr/common/timeframe";
import { t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import { ScoreService } from "../service/score.service";

@Controller("")
export default class TopScoresController {
  @Get("/scores/top/:timeframe/:page", {
    config: {},
    tags: ["scores"],
    params: t.Object({
      timeframe: t.String({ required: true, default: "daily" }),
      page: t.Number({ required: true, default: 1 }),
    }),
  })
  public async getTopScores({
    params: { timeframe, page },
  }: {
    params: { timeframe: Timeframe; page: number };
  }): Promise<unknown> {
    if (!["daily", "weekly", "monthly", "all"].includes(timeframe)) {
      timeframe = "daily";
    }

    return (await ScoreService.getTopScores(timeframe, page)).toJSON();
  }
}
