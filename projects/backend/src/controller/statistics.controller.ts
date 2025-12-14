import { StatisticsResponse } from "@ssr/common/response/platform-statistics-response";
import { Elysia } from "elysia";
import StatisticsService from "../service/statistics.service";

export default function statisticsController(app: Elysia) {
  return app.group("/statistics", app =>
    app.get(
      "/scoresaber",
      async (): Promise<StatisticsResponse> => {
        return {
          statistics: await StatisticsService.getScoreSaberStatistics(120), // ~4 months
        };
      },
      {
        tags: ["Statistics"],
        detail: {
          description: "Fetch the platform statistics for ScoreSaber",
        },
      }
    )
  );
}
