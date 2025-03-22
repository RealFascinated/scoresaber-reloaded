import * as dotenv from "@dotenvx/dotenvx";
import cors from "@elysiajs/cors";
import { cron } from "@elysiajs/cron";
import { serverTiming } from "@elysiajs/server-timing";
import { swagger } from "@elysiajs/swagger";
import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { isProduction } from "@ssr/common/utils/utils";
import { connectBeatLeaderWebsocket } from "@ssr/common/websocket/beatleader-websocket";
import { connectScoresaberWebsocket } from "@ssr/common/websocket/scoresaber-websocket";
import { logger } from "@tqman/nice-logger";
import { EmbedBuilder } from "discord.js";
import { Elysia, ValidationError } from "elysia";
import { decorators } from "elysia-decorators";
import { helmet } from "elysia-helmet";
import mongoose from "mongoose";
import { DiscordChannels, initDiscordBot, logToChannel } from "./bot/bot";
import { getAppVersion } from "./common/app.util";
import AppController from "./controller/app.controller";
import BeatSaverController from "./controller/beatsaver.controller";
import LeaderboardController from "./controller/leaderboard.controller";
import PlayerController from "./controller/player.controller";
import PlaylistController from "./controller/playlist.controller";
import ScoresController from "./controller/scores.controller";
import StatisticsController from "./controller/statistics.controller";
import TrackedScoresMetric from "./metrics/impl/tracked-scores";
import BeatLeaderService from "./service/beatleader.service";
import CacheService from "./service/cache.service";
import LeaderboardService from "./service/leaderboard.service";
import MetricsService, { MetricType } from "./service/metrics.service";
import { PlayerService } from "./service/player.service";
import { ScoreService } from "./service/score/score.service";
import ScoreSaberService from "./service/scoresaber.service";
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

// Connect to websockets
connectScoresaberWebsocket({
  onScore: async score => {
    // Fetch player info
    const player = await ScoreSaberService.updatePlayerCache(score.score.leaderboardPlayerInfo);

    // Track score
    await ScoreService.trackScoreSaberScore(score.score, score.leaderboard, player);
    await PlayerService.updatePlayerScoresSet(score);

    // Notify
    await ScoreSaberService.notifyScore(score, player, "scoreFloodGate");
    await ScoreSaberService.notifyScore(score, player, "numberOne");
    await ScoreSaberService.notifyScore(score, player, "top50AllTime");

    // Update metric
    const trackedScoresMetric = (await MetricsService.getMetric(
      MetricType.TRACKED_SCORES
    )) as TrackedScoresMetric;
    trackedScoresMetric.increment();
  },
});
connectBeatLeaderWebsocket({
  onScore: async score => {
    await BeatLeaderService.trackBeatLeaderScore(score);
  },
});

export const app = new Elysia();

app.use(
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
      await PlayerService.updatePlayerStatistics();
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
    name: "player-scores-tracker-cron",
    pattern: "0 4 * * *", // Every day at 04:00
    timezone: "Europe/London", // UTC time
    protect: true,
    run: async () => {
      const before = Date.now();
      await logToChannel(
        DiscordChannels.backendLogs,
        new EmbedBuilder().setDescription(`Refreshing player scores...`)
      );
      const missingScores = await PlayerService.refreshPlayerScores();
      await logToChannel(
        DiscordChannels.backendLogs,
        new EmbedBuilder().setDescription(
          `Refreshed player scores in ${formatDuration(Date.now() - before)}, found ${missingScores} missing scores`
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
 * Enable server timings
 */
app.use(
  serverTiming({
    enabled: true,
  })
);

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

/**
 * Swagger Documentation
 */
app.use(
  swagger({
    documentation: {
      info: {
        title: "ScoreSaber Reloaded Documentation",
        version: await getAppVersion(),
      },
    },
    scalarConfig: {
      servers: [
        {
          url: "https://ssr-api.fascinated.cc",
          description: "Production server",
        },
      ],
    },
  })
);

app.onStart(async () => {
  Logger.info("Listening on port http://localhost:8080");
  if (isProduction()) {
    await initDiscordBot();
  }

  new MetricsService();
  new CacheService();
  new StatisticsService();
});

app.listen({
  port: 8080,
  idleTimeout: 120, // 2 minutes
});
