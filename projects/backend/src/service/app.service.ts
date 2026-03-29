import { BeatLeaderScoreModel } from "@ssr/common/model/beatleader-score/beatleader-score";
import { ScoreSaberLeaderboardModel } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { count, eq } from "drizzle-orm";
import { db } from "../db";
import { scoreSaberAccountsTable } from "../db/schema";
import { ScoreSaberPreviousScoreModel } from "@ssr/common/model/score/impl/scoresaber-previous-score";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { AppStatisticsResponse } from "@ssr/common/schemas/response/ssr/app-statistics";
import ActiveAccountsMetric from "../metrics/impl/player/active-accounts";
import MetricsService, { MetricType } from "./metrics.service";

export class AppService {
  /**
   * Gets the app statistics.
   */
  public static async getAppStatistics(): Promise<AppStatisticsResponse> {
    const [
      trackedScores,
      scoreHistoryScores,
      storedReplays,
      inactivePlayers,
      activePlayers,
      leaderboardCount,
    ] = await Promise.all([
      ScoreSaberScoreModel.estimatedDocumentCount(),
      ScoreSaberPreviousScoreModel.estimatedDocumentCount(),
      BeatLeaderScoreModel.countDocuments({
        savedReplay: true,
      }),
      (async () => {
        const [row] = await db
          .select({ c: count() })
          .from(scoreSaberAccountsTable)
          .where(eq(scoreSaberAccountsTable.inactive, true));
        return row?.c ?? 0;
      })(),
      MetricsService.getMetric<ActiveAccountsMetric>(MetricType.ACTIVE_ACCOUNTS)?.value || 0,
      ScoreSaberLeaderboardModel.estimatedDocumentCount(),
    ]);

    return {
      leaderboardCount,
      trackedScores,
      scoreHistoryScores,
      storedReplays,
      inactivePlayers,
      activePlayers,
    };
  }
}
