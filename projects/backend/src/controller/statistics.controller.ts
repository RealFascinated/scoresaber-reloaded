import { StatisticsResponse } from "@ssr/common/response/platform-statistics-response";
import { Controller, Get } from "elysia-decorators";
import StatisticsService from "../service/statistics.service";

@Controller("/statistics")
export default class StatisticsController {
  @Get("/scoresaber", {
    config: {},
    tags: ["statistics"],
  })
  public async getPlatformStatistics(): Promise<StatisticsResponse> {
    return {
      statistics: await StatisticsService.getScoreSaberStatistics(180),
    };
  }
}
