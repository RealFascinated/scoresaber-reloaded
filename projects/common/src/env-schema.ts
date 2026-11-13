import { Type } from "typebox";

/**
 * Only used to derive the type of `env`. `env.ts` imports it with `import type`, so TypeBox never ends up in
 * browser bundles.
 */
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
  IGNORE_WEBSOCKET_SCORES: Type.Optional(Type.Boolean()),

  S3_ENDPOINT: Type.String(),
  S3_ACCESS_KEY: Type.String(),
  S3_SECRET_KEY: Type.String(),
  S3_REGION: Type.String(),

  PROMETHEUS_AUTH_TOKEN: Type.String(),

  /** Comma separated client addresses the backend's rate limiter skips (e.g. the website's own server) */
  RATE_LIMIT_ALLOWLIST: Type.Optional(Type.String()),

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

  // Auth (Better Auth)
  BETTER_AUTH_SECRET: Type.String(),
  STEAM_API_KEY: Type.Optional(Type.String()),
  AUTH_COOKIE_DOMAIN: Type.Optional(Type.String()),
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

export const envSchema = Type.Evaluate(Type.Intersect([serverSchema, clientSchema]));
