import { AppStatisticsResponse } from "@ssr/common/schemas/response/ssr/app-statistics";
import { count, eq } from "drizzle-orm";
import { db } from "../db";
import { beatLeaderScoresTable, scoreSaberAccountsTable } from "../db/schema";
import ActiveAccountsMetric from "../metrics/impl/player/active-accounts";
import { LeaderboardCoreService } from "./leaderboard/leaderboard-core.service";
import MetricsService, { MetricType } from "./metrics.service";
import { PlayerScoreHistoryService } from "./player/player-score-history.service";
import { PlayerScoresService } from "./player/player-scores.service";

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
      PlayerScoresService.getTotalScoresCount(),
      PlayerScoreHistoryService.getTotalPreviousScoresCount(),
      (async () => {
        const [row] = await db
          .select({ c: count() })
          .from(beatLeaderScoresTable)
          .where(eq(beatLeaderScoresTable.savedReplay, true));
        return Number(row?.c ?? 0);
      })(),
      (async () => {
        const [row] = await db
          .select({ c: count() })
          .from(scoreSaberAccountsTable)
          .where(eq(scoreSaberAccountsTable.inactive, true));
        return Number(row?.c ?? 0);
      })(),
      MetricsService.getMetric<ActiveAccountsMetric>(MetricType.ACTIVE_ACCOUNTS)?.value || 0,
      LeaderboardCoreService.getTotalLeaderboardsCount(),
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
