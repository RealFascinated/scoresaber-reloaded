import { isProduction } from "@ssr/common/utils/utils";
import { Registry } from "prom-client";

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
  CACHE_PERFORMANCE = "cache_performance",
  PROCESS_UPTIME = "process_uptime",
  PROCESS_CPU = "process_cpu",
  REDIS_HEALTH = "redis_health",

  // Queue metrics
  QUEUE_SIZES = "queue_sizes",
  QUEUE_PROCESSING_DURATION = "queue_processing_duration",

  // Database metrics
  POSTGRES_DB_SIZE = "postgres_db_size",
  LEADERBOARD_COUNT = "leaderboard_count",
}
