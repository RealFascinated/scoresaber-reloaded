import { GamePlatform } from "@ssr/common/model/statistics/game-platform";
import { PlatformStatisticsResponse } from "@ssr/common/response/platform-statistics-response";
import { t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import StatisticsService from "../service/statistics.service";

@Controller("/statistics")
export default class StatisticsController {
  @Get("/:platform", {
    config: {},
    tags: ["statistics"],
    params: t.Object({
      platform: t.String({ required: true }),
    }),
  })
  public async getPlatformStatistics({
    params: { platform },
  }: {
    params: { platform: GamePlatform };
  }): Promise<PlatformStatisticsResponse> {
    return {
      statistics: (await StatisticsService.getPlatform(platform))?.getPrevious(365) ?? {},
    };
  }
}
