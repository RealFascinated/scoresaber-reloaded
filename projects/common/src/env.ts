import { Type, type StaticDecode } from "@sinclair/typebox";

const serverSchema = Type.Object({
  // Databases
  DATABASE_URL: Type.String(),
  DATABASE_POOL_MAX: Type.Integer({ minimum: 1, default: 50 }),
  DATABASE_POOL_MIN: Type.Integer({ minimum: 0, default: 10 }),
  DATABASE_POOL_IDLE_TIMEOUT_MS: Type.Integer({ minimum: 1, default: 30_000 }),
  DATABASE_POOL_CONNECTION_TIMEOUT_MS: Type.Integer({ minimum: 1, default: 2000 }),
  REDIS_URL: Type.String(),

  LOG_LEVEL: Type.Optional(
    Type.Union([Type.Literal("debug"), Type.Literal("info"), Type.Literal("warn"), Type.Literal("error")])
  ),

  ENABLE_QUEUES: Type.Boolean(),

  S3_ENDPOINT: Type.String(),
  S3_ACCESS_KEY: Type.String(),
  S3_SECRET_KEY: Type.String(),
  S3_REGION: Type.String(),

  PROMETHEUS_AUTH_TOKEN: Type.String(),

  DISCORD_BOT_TOKEN: Type.Optional(Type.String()),

  DISCORD_CHANNEL_TRACKED_PLAYER_LOGS: Type.Optional(Type.String()),
  DISCORD_CHANNEL_PLAYER_SCORE_REFRESH_LOGS: Type.Optional(Type.String()),
  DISCORD_CHANNEL_RANKED_BATCH_LOGS: Type.Optional(Type.String()),
  DISCORD_CHANNEL_NUMBER_ONE_FEED: Type.Optional(Type.String()),
  DISCORD_CHANNEL_TOP_50_SCORES_FEED: Type.Optional(Type.String()),
  DISCORD_CHANNEL_SCORE_FLOODGATE_FEED: Type.Optional(Type.String()),
  DISCORD_CHANNEL_MEDAL_SCORES_FEED: Type.Optional(Type.String()),
  DISCORD_CHANNEL_BACKEND_LOGS: Type.Optional(Type.String()),
  DISCORD_CHANNEL_BEATSAVER_LOGS: Type.Optional(Type.String()),

  PROXY_URL: Type.String(),
});

const clientSchema = Type.Object({
  NEXT_PUBLIC_APP_ENV: Type.Union([Type.Literal("development"), Type.Literal("production")]),
  NEXT_PUBLIC_APPLICATION_NAME: Type.Union([Type.Literal("backend"), Type.Literal("website")]),

  NEXT_PUBLIC_WEBSITE_NAME: Type.String(),
  NEXT_PUBLIC_WEBSITE_URL: Type.String(),
  NEXT_PUBLIC_API_URL: Type.String(),
  NEXT_PUBLIC_CDN_URL: Type.String(),
  NEXT_PUBLIC_WEBSOCKET_URL: Type.String(),

  NEXT_PUBLIC_ANALYTICS_WEBSITE_ID: Type.Optional(Type.String()),
  NEXT_PUBLIC_ANALYTICS_SCRIPT_URL: Type.Optional(Type.String()),
});

const envSchema = Type.Composite([serverSchema, clientSchema]);

/**
 * Environment variables, typed via the schemas above.
 * Values pass through raw (matching the old `skipValidation` behavior); the double cast
 * bridges the uncoerced string values to their declared types.
 */
export const env = {
  LOG_LEVEL: process.env.LOG_LEVEL ?? "info",

  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV ?? "development",
  NEXT_PUBLIC_APPLICATION_NAME: process.env.NEXT_PUBLIC_APPLICATION_NAME,

  ENABLE_QUEUES: process.env.ENABLE_QUEUES === "true",

  // PostgreSQL
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX,
  DATABASE_POOL_MIN: process.env.DATABASE_POOL_MIN,
  DATABASE_POOL_IDLE_TIMEOUT_MS: process.env.DATABASE_POOL_IDLE_TIMEOUT_MS,
  DATABASE_POOL_CONNECTION_TIMEOUT_MS: process.env.DATABASE_POOL_CONNECTION_TIMEOUT_MS,

  // Redis
  REDIS_URL: process.env.REDIS_URL,

  // Discord Bot
  DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,

  DISCORD_CHANNEL_TRACKED_PLAYER_LOGS: process.env.DISCORD_CHANNEL_TRACKED_PLAYER_LOGS,
  DISCORD_CHANNEL_PLAYER_SCORE_REFRESH_LOGS: process.env.DISCORD_CHANNEL_PLAYER_SCORE_REFRESH_LOGS,
  DISCORD_CHANNEL_RANKED_BATCH_LOGS: process.env.DISCORD_CHANNEL_RANKED_BATCH_LOGS,
  DISCORD_CHANNEL_NUMBER_ONE_FEED: process.env.DISCORD_CHANNEL_NUMBER_ONE_FEED,
  DISCORD_CHANNEL_TOP_50_SCORES_FEED: process.env.DISCORD_CHANNEL_TOP_50_SCORES_FEED,
  DISCORD_CHANNEL_SCORE_FLOODGATE_FEED: process.env.DISCORD_CHANNEL_SCORE_FLOODGATE_FEED,
  DISCORD_CHANNEL_MEDAL_SCORES_FEED: process.env.DISCORD_CHANNEL_MEDAL_SCORES_FEED,
  DISCORD_CHANNEL_BACKEND_LOGS: process.env.DISCORD_CHANNEL_BACKEND_LOGS,
  DISCORD_CHANNEL_BEATSAVER_LOGS: process.env.DISCORD_CHANNEL_BEATSAVER_LOGS,

  // Minio
  S3_ENDPOINT: process.env.S3_ENDPOINT,
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
  S3_SECRET_KEY: process.env.S3_SECRET_KEY,
  S3_REGION: process.env.S3_REGION,

  // Prometheus
  PROMETHEUS_AUTH_TOKEN: process.env.PROMETHEUS_AUTH_TOKEN,

  // Misc
  NEXT_PUBLIC_WEBSITE_NAME: process.env.NEXT_PUBLIC_WEBSITE_NAME,
  NEXT_PUBLIC_WEBSITE_URL: process.env.NEXT_PUBLIC_WEBSITE_URL,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_CDN_URL: process.env.NEXT_PUBLIC_CDN_URL,
  NEXT_PUBLIC_WEBSOCKET_URL: process.env.NEXT_PUBLIC_WEBSOCKET_URL,

  // Analytics
  NEXT_PUBLIC_ANALYTICS_WEBSITE_ID: process.env.NEXT_PUBLIC_ANALYTICS_WEBSITE_ID,
  NEXT_PUBLIC_ANALYTICS_SCRIPT_URL: process.env.NEXT_PUBLIC_ANALYTICS_SCRIPT_URL,

  PROXY_URL: process.env.PROXY_URL,
} as unknown as StaticDecode<typeof envSchema>;
