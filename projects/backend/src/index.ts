import * as dotenv from "@dotenvx/dotenvx";
import cors from "@elysiajs/cors";
import { cron } from "@elysiajs/cron";
import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { isProduction } from "@ssr/common/utils/utils";
import { logger } from "@tqman/nice-logger";
import { EmbedBuilder } from "discord.js";
import { Elysia, ValidationError } from "elysia";
import { decorators } from "elysia-decorators";
import { helmet } from "elysia-helmet";
import mongoose from "mongoose";
import { DiscordChannels, initDiscordBot, logToChannel } from "./bot/bot";
import AppController from "./controller/app.controller";
import BeatSaverController from "./controller/beatsaver.controller";
import LeaderboardController from "./controller/leaderboard.controller";
import PlayerController from "./controller/player.controller";
import PlaylistController from "./controller/playlist.controller";
import ScoresController from "./controller/scores.controller";
import StatisticsController from "./controller/statistics.controller";
import { QueueManager } from "./queue/queue-manager";
import CacheService from "./service/cache.service";
import MetricsService from "./service/metrics.service";
import { PlayerRefreshService } from "./service/player/player-refresh.service";
import { ScoreService } from "./service/score/score.service";
import LeaderboardService from "./service/scoresaber/leaderboard.service";
import StatisticsService from "./service/statistics.service";

Logger.info("Starting SSR Backend...");

// Load .env file
if (await Bun.file(".env").exists()) {
  dotenv.config({
    path: ".env",
    override: true,
  });
}

// Connect to Mongo
Logger.info("Connecting to MongoDB...");
await mongoose.connect(env.MONGO_CONNECTION_STRING); // Connect to MongoDB
Logger.info("Connected to MongoDB :)");

export const app = new Elysia();

app.use(
  cron({
    name: "player-statistics-tracker-cron",
    // pattern: "*/5 * * * *", // Every 5 minutes
    pattern: "59 23 * * *", // Every day at 23:59
    timezone: "Europe/London", // UTC time
    protect: true,
    run: async () => {
      const before = Date.now();
      await logToChannel(
        DiscordChannels.backendLogs,
        new EmbedBuilder().setDescription(`Updating player statistics...`)
      );
      await PlayerRefreshService.updatePlayerStatistics();
      await logToChannel(
        DiscordChannels.backendLogs,
        new EmbedBuilder().setDescription(
          `Updated player statistics in ${formatDuration(Date.now() - before)}`
        )
      );
    },
  })
);
app.use(
  cron({
    name: "refresh-leaderboards-cron",
    // pattern: "*/1 * * * *", // Every 5 minutes
    pattern: "30 */2 * * *", // Every 2 hours at 30 minutes ex: 00:30, 02:30, 04:30, etc
    timezone: "Europe/London", // UTC time
    protect: true,
    run: async () => {
      await LeaderboardService.refreshRankedLeaderboards();
      await LeaderboardService.refreshQualifiedLeaderboards();
    },
  })
);
app.use(
  cron({
    name: "update-scoresaber-statistics",
    // pattern: "*/1 * * * *", // Every 1 minute
    pattern: "50 23 * * *", // Every day at 23:50
    timezone: "Europe/London", // UTC time
    protect: true,
    run: async () => {
      await StatisticsService.trackScoreSaberStatistics();
    },
  })
);

/**
 * Custom error handler
 */
app.onError({ as: "global" }, ({ code, error }) => {
  // Return default error for type validation
  if (code === "VALIDATION") {
    return (error as ValidationError).all;
  }

  // Assume unknown error is an internal server error
  if (code === "UNKNOWN") {
    code = "INTERNAL_SERVER_ERROR";
  }

  let status = "status" in error ? error.status : undefined;
  if (status === undefined) {
    switch (code) {
      case "INTERNAL_SERVER_ERROR":
        status = 500;
        break;
      case "NOT_FOUND":
        status = 404;
        break;
      case "PARSE":
        status = 400;
        break;
      case "INVALID_COOKIE_SIGNATURE":
        status = 401;
        break;
    }
  }

  return {
    ...((status && { statusCode: status }) || { status: code }),
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error - message is not in the error type
    ...(error.message != code && { message: error.message }),
    timestamp: new Date().toISOString(),
  };
});

/**
 * Enable CORS
 */
app.use(cors());

/**
 * Request logger
 */
app.use(
  logger({
    enabled: true,
    mode: "combined",
  })
);

/**
 * Security settings
 */
app.use(
  helmet({
    hsts: false, // Disable HSTS
    contentSecurityPolicy: false, // Disable CSP
    dnsPrefetchControl: true, // Enable DNS prefetch
  })
);

/**
 * Controllers
 */
app.use(
  decorators({
    controllers: [
      AppController,
      PlayerController,
      ScoresController,
      LeaderboardController,
      StatisticsController,
      PlaylistController,
      BeatSaverController,
    ],
  })
);

app.onStart(async () => {
  Logger.info("Listening on port http://localhost:8080");
  if (isProduction()) {
    await initDiscordBot();

    logToChannel(
      DiscordChannels.backendLogs,
      new EmbedBuilder().setDescription("Backend started!")
    );
  }

  new MetricsService();
  new CacheService();
  new StatisticsService();
  new ScoreService();
  new QueueManager();
});

app.listen({
  port: 8080,
  idleTimeout: 120, // 2 minutes
});
