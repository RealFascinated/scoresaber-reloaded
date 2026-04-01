import Logger from "@ssr/common/logger";
import { isProduction } from "@ssr/common/utils/utils";
import { Registry } from "prom-client";
import { ApiServicesMetric } from "../../metrics/impl/backend/api-services";
import EventLoopLagMetric from "../../metrics/impl/backend/event-loop-lag";
import HttpResponseStatusMetric from "../../metrics/impl/backend/http-response-status";
import MemoryUsageMetric from "../../metrics/impl/backend/memory-usage";
import RedisHealthMetric from "../../metrics/impl/backend/redis-health";
import ResponseTimeHistogramMetric from "../../metrics/impl/backend/response-time";
import TotalRequestsMetric from "../../metrics/impl/backend/total-requests";
import ProcessUptimeMetric from "../../metrics/impl/backend/uptime";
import PostgresDbSizeMetric from "../../metrics/impl/database/postgres-db-size";
import ActiveAccountsMetric from "../../metrics/impl/player/active-accounts";
import ActivePlayerHmdStatisticMetric from "../../metrics/impl/player/active-player-hmd-statistic";
import BeatLeaderPlayersMetric from "../../metrics/impl/player/beatleader-players";
import BeatLeaderSeenScoresMetric from "../../metrics/impl/player/beatleader-seen-scores";
import BeatLeaderUniqueDailyPlayersMetric from "../../metrics/impl/player/beatleader-unique-daily-players";
import DailyNewAccountsMetric from "../../metrics/impl/player/daily-new-accounts";
import TotalTrackedScoresMetric from "../../metrics/impl/player/total-tracked-scores";
import TrackedPlayersMetric from "../../metrics/impl/player/tracked-players";
import TrackedScoresMetric from "../../metrics/impl/player/tracked-scores";
import UniqueDailyPlayersMetric from "../../metrics/impl/player/unique-daily-players";
import QueueProcessingDurationMetric from "../../metrics/impl/queue/queue-processing-duration";
import QueueSizesMetric from "../../metrics/impl/queue/queue-sizes";
import Metric from "../../metrics/metric";
import { MetricsRepository } from "../../repositories/metrics.repository";

// Create Prometheus registry with default labels
export const prometheusRegistry = new Registry();
prometheusRegistry.setDefaultLabels({
  environment: isProduction() ? "production" : "development",
});

export enum MetricType {
  // Player metrics
  TRACKED_SCORES = "tracked_scores",
  TRACKED_PLAYERS = "tracked_players",
  UNIQUE_DAILY_PLAYERS = "unique_daily_players",
  ACTIVE_ACCOUNTS = "active_accounts",
  ACTIVE_PLAYERS_HMD_STATISTIC = "active_players_hmd_statistic",
  TOTAL_TRACKED_SCORES = "total_tracked_scores",
  DAILY_NEW_ACCOUNTS = "daily_new_accounts",
  BEATLEADER_SEEN_SCORES = "beatleader_seen_scores",
  BEATLEADER_UNIQUE_DAILY_PLAYERS = "beatleader_unique_daily_players",
  BEATLEADER_PLAYERS = "beatleader_players",

  // Backend metrics
  MEMORY_USAGE = "memory_usage",
  EVENT_LOOP_LAG = "event_loop_lag",
  RESPONSE_TIME_MS = "response_time_ms",
  TOTAL_REQUESTS = "total_requests",
  HTTP_RESPONSES = "http_responses",
  API_SERVICES = "api_services",
  PROCESS_UPTIME = "process_uptime",
  REDIS_HEALTH = "redis_health",

  // Queue metrics
  QUEUE_SIZES = "queue_sizes",
  QUEUE_PROCESSING_DURATION = "queue_processing_duration",

  // Database metrics
  POSTGRES_DB_SIZE = "postgres_db_size",
}

export default class MetricsService {
  private static readonly metrics = new Map<MetricType, Metric<unknown>>();
  private static initialized = false;
  private static readonly persistIntervalMs = 30_000;
  private static persistInterval: ReturnType<typeof setInterval> | undefined;
  private static persistInFlight = false;

  constructor() {
    if (MetricsService.initialized) {
      return;
    }
    MetricsService.initialized = true;

    // Player metrics
    this.registerMetric(new TrackedScoresMetric());
    this.registerMetric(new TrackedPlayersMetric());
    this.registerMetric(new UniqueDailyPlayersMetric());
    this.registerMetric(new ActiveAccountsMetric());
    this.registerMetric(new ActivePlayerHmdStatisticMetric());
    this.registerMetric(new TotalTrackedScoresMetric());
    this.registerMetric(new DailyNewAccountsMetric());
    this.registerMetric(new BeatLeaderSeenScoresMetric());
    this.registerMetric(new BeatLeaderUniqueDailyPlayersMetric());
    this.registerMetric(new BeatLeaderPlayersMetric());

    // Backend metrics
    this.registerMetric(new MemoryUsageMetric());
    this.registerMetric(new EventLoopLagMetric());
    this.registerMetric(new ResponseTimeHistogramMetric());
    this.registerMetric(new TotalRequestsMetric());
    this.registerMetric(new HttpResponseStatusMetric());
    this.registerMetric(new ApiServicesMetric());
    this.registerMetric(new ProcessUptimeMetric());
    this.registerMetric(new RedisHealthMetric());

    // Queue metrics
    this.registerMetric(new QueueSizesMetric());
    this.registerMetric(new QueueProcessingDurationMetric());

    // Database metrics
    this.registerMetric(new PostgresDbSizeMetric());

    void MetricsService.loadPersistedValues();
    MetricsService.startPersistenceLoop();
  }

  /**
   * Registers a metric with the service
   *
   * @param metric the metric to register
   */
  private registerMetric(metric: Metric<unknown>): void {
    if (MetricsService.metrics.has(metric.id)) {
      Logger.warn(`[METRICS] Metric ${metric.id} already registered, skipping duplicate registration`);
      return;
    }

    MetricsService.metrics.set(metric.id, metric);
    Logger.debug(`[METRICS] Registered metric ${metric.id}`);
  }

  /**
   * Retrieves a metric by its type
   *
   * @param type the type of metric to retrieve
   * @returns the metric instance, or undefined if not found
   */
  public static getMetric<T extends Metric<unknown>>(type: MetricType): T | undefined {
    return MetricsService.metrics.get(type) as T | undefined;
  }

  public static cleanup(): void {
    if (MetricsService.persistInterval) {
      clearInterval(MetricsService.persistInterval);
      MetricsService.persistInterval = undefined;
    }
    void MetricsService.persistValues();

    for (const metric of MetricsService.metrics.values()) {
      metric.cleanup?.();
    }
  }

  private static startPersistenceLoop(): void {
    if (MetricsService.persistInterval) {
      return;
    }

    MetricsService.persistInterval = setInterval(() => {
      void MetricsService.persistValues();
    }, MetricsService.persistIntervalMs);
  }

  private static async loadPersistedValues(): Promise<void> {
    try {
      const rows = await MetricsRepository.loadAll();
      for (const row of rows) {
        const metric = MetricsService.metrics.get(row.id as MetricType);
        if (!metric) {
          continue;
        }

        metric.value = row.value;
      }

      if (rows.length > 0) {
        Logger.info(`[METRICS] Loaded ${rows.length} persisted metric values from PostgreSQL`);
      }
    } catch (error) {
      Logger.warn("[METRICS] Failed to load persisted metric values from PostgreSQL:", error);
    }
  }

  private static async persistValues(): Promise<void> {
    if (MetricsService.persistInFlight) {
      return;
    }

    const valuesToPersist = Array.from(MetricsService.metrics.entries())
      .map(([id, metric]) => ({
        id,
        value: metric.value === undefined ? null : metric.value,
      }))
      .filter(({ value }) => {
        try {
          JSON.stringify(value);
          return true;
        } catch {
          return false;
        }
      });

    if (valuesToPersist.length === 0) {
      return;
    }

    MetricsService.persistInFlight = true;
    try {
      await MetricsRepository.upsertMany(valuesToPersist);
    } catch (error) {
      Logger.warn("[METRICS] Failed to persist metric values to PostgreSQL:", error);
    } finally {
      MetricsService.persistInFlight = false;
    }
  }
}
