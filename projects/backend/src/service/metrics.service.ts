import Logger from "@ssr/common/logger";
import { isProduction } from "@ssr/common/utils/utils";
import { Registry } from "prom-client";
import { ApiServicesMetric } from "../metrics/impl/backend/api-services";
import EventLoopLagMetric from "../metrics/impl/backend/event-loop-lag";
import MemoryUsageMetric from "../metrics/impl/backend/memory-usage";
import RequestsPerSecondMetric from "../metrics/impl/backend/total-requests";
import ProcessUptimeMetric from "../metrics/impl/backend/uptime";
import MongoDbSizeMetric from "../metrics/impl/database/mongo-db-size";
import ActiveAccountsMetric from "../metrics/impl/player/active-accounts";
import ActivePlayerHmdStatisticMetric from "../metrics/impl/player/active-player-hmd-statistic";
import DailyNewAccountsMetric from "../metrics/impl/player/daily-new-accounts";
import TotalTrackedScoresMetric from "../metrics/impl/player/total-tracked-scores";
import TrackedPlayersMetric from "../metrics/impl/player/tracked-players";
import TrackedScoresMetric from "../metrics/impl/player/tracked-scores";
import UniqueDailyPlayersMetric from "../metrics/impl/player/unique-daily-players";
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
  TOTAL_REQUESTS = "total_requests",
  API_SERVICES = "api_services",
  PROCESS_UPTIME = "process_uptime",

  // Queue metrics
  QUEUE_SIZES = "queue_sizes",

  // Database metrics
  MONGO_DB_SIZE = "mongo_db_size",
}

export default class MetricsService {
  private static metrics: Metric<unknown>[] = [];

  constructor() {
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
    this.registerMetric(new RequestsPerSecondMetric());
    this.registerMetric(new ApiServicesMetric());
    this.registerMetric(new ProcessUptimeMetric());

    // Queue metrics
    this.registerMetric(new QueueSizesMetric());

    // Database metrics
    this.registerMetric(new MongoDbSizeMetric());
  }

  /**
   * Registers a metric with the service
   *
   * @param metric the metric to register
   */
  private registerMetric(metric: Metric<unknown>): void {
    MetricsService.metrics.push(metric);
    Logger.debug(`[METRICS] Registered metric ${metric.id}`);
  }

  /**
   * Retrieves a metric by its type
   *
   * @param type the type of metric to retrieve
   * @returns the metric instance, or undefined if not found
   */
  public static async getMetric(type: MetricType): Promise<Metric<unknown> | undefined> {
    return MetricsService.metrics.find(metric => metric.id === type);
  }
}
