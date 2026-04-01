import { AppStatisticsResponse } from "@ssr/common/schemas/response/ssr/app-statistics";
import ActiveAccountsMetric from "../../metrics/impl/player/active-accounts";
import { BeatLeaderScoresRepository } from "../../repositories/beatleader-scores.repository";
import { ScoreSaberAccountsRepository } from "../../repositories/scoresaber-accounts.repository";
import MetricsService, { MetricType } from "../infra/metrics.service";
import { ScoreSaberLeaderboardsService } from "../leaderboard/scoresaber-leaderboards.service";
import { PlayerScoreHistoryService } from "../player/player-score-history.service";
import { PlayerScoresService } from "../player/player-scores.service";

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
