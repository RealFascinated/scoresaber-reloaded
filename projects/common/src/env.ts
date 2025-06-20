import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    MONGO_CONNECTION_STRING: z.string(),

    MINIO_ENDPOINT: z.string(),
    MINIO_USE_SSL: z.boolean(),
    MINIO_PORT: z.number(),
    MINIO_ACCESS_KEY: z.string(),
    MINIO_SECRET_KEY: z.string(),

    INFLUXDB_URL: z.string(),
    INFLUXDB_BUCKET: z.string(),
    INFLUXDB_ORG: z.string(),
    INFLUXDB_TOKEN: z.string(),

    DISCORD_BOT_TOKEN: z.string().optional(),

    DISCORD_CHANNEL_TRACKED_PLAYER_LOGS: z.string().optional(),
    DISCORD_CHANNEL_PLAYER_SCORE_REFRESH_LOGS: z.string().optional(),
    DISCORD_CHANNEL_RANKED_BATCH_LOGS: z.string().optional(),
    DISCORD_CHANNEL_NUMBER_ONE_FEED: z.string().optional(),
    DISCORD_CHANNEL_TOP_50_SCORES_FEED: z.string().optional(),
    DISCORD_CHANNEL_SCORE_FLOODGATE_FEED: z.string().optional(),
    DISCORD_CHANNEL_BACKEND_LOGS: z.string().optional(),
  },

  client: {
    NEXT_PUBLIC_APP_ENV: z.enum(["development", "production"]),
    NEXT_PUBLIC_APPLICATION_NAME: z.enum(["backend", "website"]),

    NEXT_PUBLIC_WEBSITE_NAME: z.string(),
    NEXT_PUBLIC_WEBSITE_URL: z.string(),
    NEXT_PUBLIC_API_URL: z.string(),
    NEXT_PUBLIC_CDN_URL: z.string(),

    NEXT_PUBLIC_ANALYTICS_WEBSITE_ID: z.string().optional(),
    NEXT_PUBLIC_ANALYTICS_SCRIPT_URL: z.string().optional(),

    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().optional(),
  },

  /**
   * This is the environment variables that are available on the server.
   */
  runtimeEnv: {
    LOG_LEVEL: process.env.LOG_LEVEL,

    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV ?? "development",
    NEXT_PUBLIC_APPLICATION_NAME: process.env.NEXT_PUBLIC_APPLICATION_NAME,

    // Mongo
    MONGO_CONNECTION_STRING: process.env.MONGO_CONNECTION_STRING,

    // Discord Bot
    DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,

    DISCORD_CHANNEL_TRACKED_PLAYER_LOGS: process.env.DISCORD_CHANNEL_TRACKED_PLAYER_LOGS,
    DISCORD_CHANNEL_PLAYER_SCORE_REFRESH_LOGS:
      process.env.DISCORD_CHANNEL_PLAYER_SCORE_REFRESH_LOGS,
    DISCORD_CHANNEL_RANKED_BATCH_LOGS: process.env.DISCORD_CHANNEL_RANKED_BATCH_LOGS,
    DISCORD_CHANNEL_NUMBER_ONE_FEED: process.env.DISCORD_CHANNEL_NUMBER_ONE_FEED,
    DISCORD_CHANNEL_TOP_50_SCORES_FEED: process.env.DISCORD_CHANNEL_TOP_50_SCORES_FEED,
    DISCORD_CHANNEL_SCORE_FLOODGATE_FEED: process.env.DISCORD_CHANNEL_SCORE_FLOODGATE_FEED,
    DISCORD_CHANNEL_BACKEND_LOGS: process.env.DISCORD_CHANNEL_BACKEND_LOGS,

    // Minio
    MINIO_ENDPOINT: process.env.MINIO_ENDPOINT,
    MINIO_USE_SSL: Boolean(process.env.MINIO_USE_SSL),
    MINIO_PORT: Number(process.env.MINIO_PORT),
    MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY,
    MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY,

    // InfluxDB
    INFLUXDB_URL: process.env.INFLUXDB_URL,
    INFLUXDB_BUCKET: process.env.INFLUXDB_BUCKET,
    INFLUXDB_ORG: process.env.INFLUXDB_ORG,
    INFLUXDB_TOKEN: process.env.INFLUXDB_TOKEN,

    // Misc
    NEXT_PUBLIC_WEBSITE_NAME: process.env.NEXT_PUBLIC_WEBSITE_NAME ?? "ScoreSaber Reloaded",
    NEXT_PUBLIC_WEBSITE_URL: process.env.NEXT_PUBLIC_WEBSITE_URL ?? "https://ssr.fascinated.cc",
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "https://ssr-api.fascinated.cc",
    NEXT_PUBLIC_CDN_URL: process.env.NEXT_PUBLIC_CDN_URL ?? "https://s3-api.fascinated.cc",

    // Analytics
    NEXT_PUBLIC_ANALYTICS_WEBSITE_ID: process.env.NEXT_PUBLIC_ANALYTICS_WEBSITE_ID,
    NEXT_PUBLIC_ANALYTICS_SCRIPT_URL: process.env.NEXT_PUBLIC_ANALYTICS_SCRIPT_URL,

    // PostHog
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  },

  /**
   * This is the prefix for the environment variables that are available on the client.
   */
  clientPrefix: "NEXT_PUBLIC_",

  /**
   * Makes it so that empty strings are treated as undefined.
   * `SOME_VAR: z.string()` and `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,

  /**
   * Whether to check if the environment variables are valid.
   */
  isServer: process.env.NEXT_PUBLIC_APPLICATION_NAME === "backend",
});
