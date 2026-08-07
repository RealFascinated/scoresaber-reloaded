import Logger, { type ScopedLogger } from "@ssr/common/logger";
import { AppStatistic, AppStatisticsResponse } from "@ssr/common/schemas/response/ssr/app-statistics";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import ActiveAccountsMetric from "../../metrics/impl/player/active-accounts";
import UniqueDailyPlayersMetric from "../../metrics/impl/player/unique-daily-players";
import { BeatLeaderScoresRepository } from "../../repositories/beatleader-scores.repository";
import { ScoreSaberAccountsRepository } from "../../repositories/scoresaber-accounts.repository";
import { ScoreSaberLeaderboardsRepository } from "../../repositories/scoresaber-leaderboards.repository";
import { ScoreSaberScoreHistoryRepository } from "../../repositories/scoresaber-score-history.repository";
import { ScoreSaberScoresRepository } from "../../repositories/scoresaber-scores.repository";
import MetricsService, { MetricType } from "../infra/metrics.service";

type AppStatKey = keyof AppStatisticsResponse;
type AppStatValues = Record<AppStatKey, number>;

type AppStatSample = {
  timestamp: number;
  values: AppStatValues;
};

export class AppService {
  private static readonly logger: ScopedLogger = Logger.withTopic("App Statistics");

  /**
   * How long samples are kept for velocity calculations. Velocities are averaged
   * over this window to stay stable against short-term noise.
   */
  private static readonly SAMPLE_RETENTION_MS = TimeUnit.toMillis(TimeUnit.Hour, 1);

  /**
   * How often samples are taken when no requests are coming in.
   */
  private static readonly SAMPLE_INTERVAL_MS = TimeUnit.toMillis(TimeUnit.Minute, 1);

  /**
   * How long after startup sampling waits before taking the first sample.
   * Some metric values (e.g. active players) are only populated a minute or
   * two after boot, so sampling earlier would skew velocities.
   */
  private static readonly WARMUP_MS = TimeUnit.toMillis(TimeUnit.Minute, 2);

  private static readonly samples: AppStatSample[] = [];
  private static samplingStarted = false;

  /**
   * Starts sampling app statistics so velocities are available.
   * Call once at startup; safe to call multiple times.
   */
  public static startSampling(): void {
    if (AppService.samplingStarted) {
      return;
    }
    AppService.samplingStarted = true;

    setTimeout(() => {
      void AppService.sample();
      setInterval(() => {
        void AppService.sample();
      }, AppService.SAMPLE_INTERVAL_MS);
    }, AppService.WARMUP_MS);
  }

  /**
   * Takes a sample of the current app statistics and keeps it in the rolling window.
   */
  private static async sample(): Promise<void> {
    try {
      const values = await AppService.getRawValues();
      AppService.samples.push({ timestamp: Date.now(), values });
      AppService.pruneSamples();
    } catch (error) {
      AppService.logger.error("Failed to sample app statistics:", error);
    }
  }

  /**
   * Drops samples older than the retention window so velocities always reflect
   * the last hour of statistics.
   */
  private static pruneSamples(): void {
    const cutoff = Date.now() - AppService.SAMPLE_RETENTION_MS;
    while (AppService.samples.length > 0 && AppService.samples[0].timestamp < cutoff) {
      AppService.samples.shift();
    }
  }

  /**
   * The minimum time span (in seconds) the rolling window must cover before
   * a velocity is reported. Below this, a couple of close samples (e.g. right
   * after startup) produce wildly inflated per-second rates.
   */
  private static readonly MIN_VELOCITY_SPAN_SECONDS = 60;

  /**
   * Gets the change per second for a statistic, derived via least squares regression
   * over the rolling window of samples.
   *
   * @param key the statistic to get the velocity for
   * @returns the change per second (0 when there are not enough samples)
   */
  private static getVelocity(key: AppStatKey): number {
    const { samples } = AppService;
    if (samples.length < 2) {
      return 0;
    }

    const startTime = samples[0].timestamp;
    const spanSeconds = (samples[samples.length - 1].timestamp - startTime) / 1000;
    if (spanSeconds < AppService.MIN_VELOCITY_SPAN_SECONDS) {
      return 0;
    }

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    for (const sample of samples) {
      const x = (sample.timestamp - startTime) / 1000; // seconds since the first sample
      const y = sample.values[key];
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    }

    const denominator = samples.length * sumXX - sumX * sumX;
    if (denominator === 0) {
      return 0;
    }
    return (samples.length * sumXY - sumX * sumY) / denominator;
  }

  /**
   * Gets the current raw values for all app statistics.
   */
  private static async getRawValues(): Promise<AppStatValues> {
    const [
      trackedScores,
      scoreHistoryScores,
      storedReplays,
      inactivePlayers,
      activePlayers,
      leaderboardCount,
      uniquePlayersToday,
    ] = await Promise.all([
      ScoreSaberScoresRepository.countTotal(),
      ScoreSaberScoreHistoryRepository.countTotal(),
      BeatLeaderScoresRepository.countSavedReplays(),
      ScoreSaberAccountsRepository.countInactive(),
      MetricsService.getMetric<ActiveAccountsMetric>(MetricType.ACTIVE_ACCOUNTS)?.value || 0,
      ScoreSaberLeaderboardsRepository.countTotal(),
      MetricsService.getMetric<UniqueDailyPlayersMetric>(MetricType.UNIQUE_DAILY_PLAYERS)?.getUniqueCount() ??
        0,
    ]);

    return {
      leaderboardCount,
      trackedScores,
      scoreHistoryScores,
      storedReplays,
      inactivePlayers,
      activePlayers,
      uniquePlayersToday,
    };
  }

  /**
   * Gets the app statistics, with the change per second for each statistic.
   */
  public static async getAppStatistics(): Promise<AppStatisticsResponse> {
    const values = await AppService.getRawValues();

    const statistics = {} as Record<AppStatKey, AppStatistic>;
    for (const key of Object.keys(values) as AppStatKey[]) {
      statistics[key] = {
        value: values[key],
        velocity: AppService.getVelocity(key),
      };
    }
    return statistics;
  }
}
