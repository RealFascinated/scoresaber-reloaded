import { AppStatisticsResponse } from "@ssr/common/schemas/response/ssr/app-statistics";
import ActiveAccountsMetric from "../../metrics/impl/player/active-accounts";
import { BeatLeaderScoresRepository } from "../../repositories/beatleader-scores.repository";
import { ScoreSaberAccountsRepository } from "../../repositories/scoresaber-accounts.repository";
import { ScoreSaberScoreHistoryRepository } from "../../repositories/scoresaber-score-history.repository";
import { ScoreSaberScoresRepository } from "../../repositories/scoresaber-scores.repository";
import MetricsService, { MetricType } from "../infra/metrics.service";
import { ScoreSaberLeaderboardsService } from "../leaderboard/scoresaber-leaderboards.service";

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
      ScoreSaberScoresRepository.getApproximateTotalRowCount(),
      ScoreSaberScoreHistoryRepository.getApproximateTotalRowCount(),
      BeatLeaderScoresRepository.countSavedReplays(),
      ScoreSaberAccountsRepository.countInactive(),
      MetricsService.getMetric<ActiveAccountsMetric>(MetricType.ACTIVE_ACCOUNTS)?.value || 0,
      ScoreSaberLeaderboardsService.getTotalLeaderboardsCount(),
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
