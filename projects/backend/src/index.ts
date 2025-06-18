import { etag } from "@bogeychan/elysia-etag";
import * as dotenv from "@dotenvx/dotenvx";
import cors from "@elysiajs/cors";
import { cron } from "@elysiajs/cron";
import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { isProduction } from "@ssr/common/utils/utils";
import { logger } from "@tqman/nice-logger";
import { mongoose } from "@typegoose/typegoose";
import { EmbedBuilder } from "discord.js";
import { Elysia, ValidationError } from "elysia";
import { decorators } from "elysia-decorators";
import { helmet } from "elysia-helmet";
import { DiscordChannels, initDiscordBot, logToChannel } from "./bot/bot";
import AppController from "./controller/app.controller";
import BeatSaverController from "./controller/beatsaver.controller";
import LeaderboardController from "./controller/leaderboard.controller";
import PlayerController from "./controller/player.controller";
import PlaylistController from "./controller/playlist.controller";
import ReplayController from "./controller/replay.controller";
import ScoresController from "./controller/scores.controller";
import StatisticsController from "./controller/statistics.controller";
import { EventsManager } from "./event/events-manager";
import { metricsPlugin } from "./plugins/metrics.plugin";
import { QueueManager } from "./queue/queue-manager";
import CacheService from "./service/cache.service";
import MetricsService from "./service/metrics.service";
import { PlayerRefreshService } from "./service/player/player-refresh.service";
import PlaylistService from "./service/playlist.service";
import { ScoreService } from "./service/score/score.service";
import LeaderboardService from "./service/scoresaber/leaderboard.service";
import StatisticsService from "./service/statistics.service";
import { BeatSaverWebsocket } from "./websocket/beatsaver-websocket";
import { ScoreWebsockets } from "./websocket/score-websockets";

Logger.info("Starting SSR Backend...");

// Load .env file
if (await Bun.file(".env").exists()) {
  dotenv.config({
    path: ".env",
    override: true,
  });
}

new EventsManager();

// Connect to Mongo
Logger.info("Connecting to MongoDB...");

try {
  await mongoose.connect(env.MONGO_CONNECTION_STRING);
} catch (error) {
  Logger.error("Failed to connect to MongoDB:", error);
  process.exit(1);
}

Logger.info("Connected to MongoDB :)");

export const app = new Elysia()
  .use(metricsPlugin())
  .use(
    cron({
      name: "player-statistics-tracker-cron",
      // pattern: "*/1 * * * *", // Every 5 minutes
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
  )
  .use(
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
  etag({
    serialize(response) {
      if (typeof response === "object") {
        return JSON.stringify(response);
      }
      return String(response);
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

  if (code === "INTERNAL_SERVER_ERROR") {
    console.log(error);
  }

  return {
    ...((status && { statusCode: status }) || { status: code }),
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
      ReplayController,
    ],
  })
);

app.onStart(async () => {
  EventsManager.getListeners().forEach(listener => {
    listener.onStart?.();
  });

  Logger.info("Listening on port http://localhost:8080");
  if (isProduction()) {
    await initDiscordBot();

    logToChannel(
      DiscordChannels.backendLogs,
      new EmbedBuilder().setDescription("Backend started!")
    );
  }

  // Log all registered routes
  Logger.info("Registered routes:");
  for (const route of app.routes) {
    Logger.info(`${route.method} ${route.path}`);
  }

  // Must be registered first
  new ScoreWebsockets();
  new BeatSaverWebsocket();

  new MetricsService();
  new CacheService();
  new StatisticsService();
  new ScoreService();
  new PlaylistService();

  EventsManager.registerListener(new QueueManager());
});

app.listen({
  port: 8080,
  idleTimeout: 120, // 2 minutes
});

// Add signal handlers for graceful shutdown
const setupSignalHandlers = () => {
  let isShuttingDown = false;
  let forceExitTimeout: NodeJS.Timeout | null = null;

  const shutdown = async () => {
    if (isShuttingDown) {
      Logger.info("Shutdown already in progress, ignoring signal");
      return;
    }
    isShuttingDown = true;

    Logger.info("Starting graceful shutdown...");

    try {
      // Stop accepting new requests
      await app.stop();
      Logger.info("Server stopped accepting new requests");

      logToChannel(
        DiscordChannels.backendLogs,
        new EmbedBuilder().setDescription("Backend shutting down...")
      );

      // Stop all event listeners (this will also stop queues through QueueManager)
      Logger.info("Stopping all services...");
      EventsManager.getListeners().forEach(listener => {
        listener.onStop?.();
      });
      Logger.info("All services stopped");

      // Close MongoDB connection
      try {
        await mongoose.disconnect();
        Logger.info("MongoDB connection closed");
      } catch (error) {
        Logger.error("Error closing MongoDB connection:", error);
      }

      // Clear the force exit timeout if it exists
      if (forceExitTimeout) {
        clearTimeout(forceExitTimeout);
      }

      Logger.info("Shutdown complete");
      process.exit(0);
    } catch (error) {
      Logger.error("Error during shutdown:", error);
      process.exit(1);
    }
  };

  // Handle both SIGTERM and SIGINT with a single handler
  const handleSignal = (signal: string) => {
    if (isShuttingDown) {
      Logger.info(`Received ${signal} but shutdown already in progress, ignoring`);
      return;
    }

    Logger.info(`Received ${signal}`);
    shutdown();

    // Set up force exit timeout only once
    if (!forceExitTimeout) {
      forceExitTimeout = setTimeout(() => {
        Logger.error("Forced shutdown after timeout");
        process.exit(1);
      }, 10000);
    }
  };

  // Remove any existing handlers first
  process.removeAllListeners("SIGTERM");
  process.removeAllListeners("SIGINT");

  // Add our handlers
  process.on("SIGTERM", () => handleSignal("SIGTERM"));
  process.on("SIGINT", () => handleSignal("SIGINT"));
};

// Setup signal handlers after server starts
setupSignalHandlers();
