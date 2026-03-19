import Logger from "@ssr/common/logger";
import { isProduction } from "@ssr/common/utils/utils";
import { Registry } from "prom-client";
import { ApiServicesMetric } from "../metrics/impl/backend/api-services";
import EventLoopLagMetric from "../metrics/impl/backend/event-loop-lag";
import HttpResponseStatusMetric from "../metrics/impl/backend/http-response-status";
import MemoryUsageMetric from "../metrics/impl/backend/memory-usage";
import RedisHealthMetric from "../metrics/impl/backend/redis-health";
import ResponseTimeHistogramMetric from "../metrics/impl/backend/response-time";
import TotalRequestsMetric from "../metrics/impl/backend/total-requests";
import ProcessUptimeMetric from "../metrics/impl/backend/uptime";
import MongoDbSizeMetric from "../metrics/impl/database/mongo-db-size";
import ActiveAccountsMetric from "../metrics/impl/player/active-accounts";
import ActivePlayerHmdStatisticMetric from "../metrics/impl/player/active-player-hmd-statistic";
import DailyNewAccountsMetric from "../metrics/impl/player/daily-new-accounts";
import TotalTrackedScoresMetric from "../metrics/impl/player/total-tracked-scores";
import TrackedPlayersMetric from "../metrics/impl/player/tracked-players";
import TrackedScoresMetric from "../metrics/impl/player/tracked-scores";
import UniqueDailyPlayersMetric from "../metrics/impl/player/unique-daily-players";
import QueueProcessingDurationMetric from "../metrics/impl/queue/queue-processing-duration";
import QueueSizesMetric from "../metrics/impl/queue/queue-sizes";
import Metric from "../metrics/metric";

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
  MONGO_DB_SIZE = "mongo_db_size",
}

export default class MetricsService {
  private static readonly metrics = new Map<MetricType, Metric<unknown>>();
  private static initialized = false;

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
    this.registerMetric(new MongoDbSizeMetric());
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
  public static async getMetric(type: MetricType): Promise<Metric<unknown> | undefined> {
    return MetricsService.metrics.get(type);
  }

  public static cleanup(): void {
    for (const metric of MetricsService.metrics.values()) {
      metric.cleanup?.();
    }
  }
}
