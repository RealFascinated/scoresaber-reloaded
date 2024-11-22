import { Controller, Get } from "elysia-decorators";
import { t } from "elysia";
import { GamePlatform } from "@ssr/common/model/statistics/game-platform";
import { PlatformStatisticsResponse } from "@ssr/common/response/platform-statistics-response";
import StatisticsService from "../service/statistics.service";

@Controller("/statistics")
export default class StatisticsController {
  @Get("/:platform", {
    config: {},
    tags: ["statistics"],
    params: t.Object({
      platform: t.String({ required: true }),
    }),
    detail: {
      responses: {
        200: {
          description: "The platform statistics.",
        },
      },
      description: "Lookup platform statistics",
    },
  })
  public async getPlatformStatistics({
    params: { platform },
  }: {
    params: { platform: GamePlatform };
  }): Promise<PlatformStatisticsResponse> {
    return {
      statistics: (await StatisticsService.getPlatform(platform))?.getPrevious(60) ?? {},
    };
  }
}
