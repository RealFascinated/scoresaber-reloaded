import { Elysia } from "elysia";
import cors from "@elysiajs/cors";
import { decorators } from "elysia-decorators";
import { logger } from "@tqman/nice-logger";
import { swagger } from "@elysiajs/swagger";
import { helmet } from "elysia-helmet";
import { etag } from "@bogeychan/elysia-etag";
import AppController from "./controller/app.controller";
import * as dotenv from "@dotenvx/dotenvx";
import mongoose from "mongoose";
import PlayerController from "./controller/player.controller";
import { PlayerService } from "./service/player.service";
import { cron } from "@elysiajs/cron";
import { isProduction } from "@ssr/common/utils/utils";
import ImageController from "./controller/image.controller";
import { Config } from "@ssr/common/config";
import ScoresController from "./controller/scores.controller";
import LeaderboardController from "./controller/leaderboard.controller";
import { getAppVersion } from "./common/app.util";
import { connectScoresaberWebsocket } from "@ssr/common/websocket/scoresaber-websocket";
import { connectBeatLeaderWebsocket } from "@ssr/common/websocket/beatleader-websocket";
import { DiscordChannels, initDiscordBot, logToChannel } from "./bot/bot";
import { EmbedBuilder } from "discord.js";
import MetricsService from "./service/metrics.service";
import LeaderboardService from "./service/leaderboard.service";
import CacheService from "./service/cache.service";
import { formatDuration } from "@ssr/common/utils/time-utils";
import StatisticsService from "./service/statistics.service";
import StatisticsController from "./controller/statistics.controller";
import { serverTiming } from "@elysiajs/server-timing";
import PlaylistController from "./controller/playlist.controller";
import ScoreSaberService from "./service/scoresaber.service";
import BeatLeaderService from "./service/beatleader.service";

// Load .env file
if (await Bun.file(".env").exists()) {
  dotenv.config({
    path: ".env",
    override: true,
  });
}

// Connect to Mongo
await mongoose.connect(Config.mongoUri!); // Connect to MongoDB

// Connect to websockets
connectScoresaberWebsocket({
  onScore: async score => {
    await ScoreSaberService.trackScoreSaberScore(score.score, score.leaderboard);
    await PlayerService.updatePlayerScoresSet(score);

    await ScoreSaberService.notifyNumberOne(score);
  },
  onDisconnect: async error => {
    await logToChannel(
      DiscordChannels.backendLogs,
      new EmbedBuilder().setDescription(`ScoreSaber websocket disconnected: ${JSON.stringify(error)}`)
    );
  },
});
connectBeatLeaderWebsocket({
  onScore: async score => {
    await BeatLeaderService.trackBeatLeaderScore(score);
  },
  onDisconnect: async error => {
    await logToChannel(
      DiscordChannels.backendLogs,
      new EmbedBuilder().setDescription(`BeatLeader websocket disconnected: ${JSON.stringify(error)}`)
    );
  },
});

export const app = new Elysia();
app.use(
  cron({
    name: "player-statistics-tracker-cron",
    pattern: "0 1 * * *", // Every day at 00:01
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
        new EmbedBuilder().setDescription(`Updated player statistics in ${formatDuration(Date.now() - before)}`)
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
      await logToChannel(DiscordChannels.backendLogs, new EmbedBuilder().setDescription(`Refreshing player scores...`));
      await PlayerService.refreshPlayerScores();
      await logToChannel(
        DiscordChannels.backendLogs,
        new EmbedBuilder().setDescription(`Refreshed player scores in ${formatDuration(Date.now() - before)}`)
      );
    },
  })
);
app.use(
  cron({
    name: "refresh-leaderboards-cron",
    pattern: "*/1 * * * *", // Every 6 hours
    // pattern: "0 */6 * * *", // Every 6 hours
    timezone: "Europe/London", // UTC time
    protect: true,
    run: async () => {
      let before = Date.now();
      await logToChannel(
        DiscordChannels.backendLogs,
        new EmbedBuilder().setDescription(`Refreshing ranked leaderboards...`)
      );
      await LeaderboardService.refreshRankedLeaderboards();
      await logToChannel(
        DiscordChannels.backendLogs,
        new EmbedBuilder().setDescription(`Refreshed ranked leaderboards in ${formatDuration(Date.now() - before)}`)
      );

      before = Date.now();
      await logToChannel(
        DiscordChannels.backendLogs,
        new EmbedBuilder().setDescription(`Refreshing qualified leaderboards...`)
      );
      await LeaderboardService.refreshQualifiedLeaderboards();
      await logToChannel(
        DiscordChannels.backendLogs,
        new EmbedBuilder().setDescription(`Refreshed qualified leaderboards in ${formatDuration(Date.now() - before)}`)
      );
    },
  })
);
app.use(
  cron({
    name: "update-scoresaber-statistics",
    pattern: "59 23 * * *", // Every day at 23:59
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
    return error.all;
  }

  const status = "status" in error ? error.status : undefined;
  return {
    ...((status && { statusCode: status }) || { status: code }),
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
 * Enable E-Tags
 */
app.use(etag());

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
      ImageController,
      ScoresController,
      LeaderboardController,
      StatisticsController,
      PlaylistController,
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
          url: "https://ssr.fascinated.cc/api",
          description: "Production server",
        },
      ],
    },
  })
);

app.onStart(async () => {
  console.log("Listening on port http://localhost:8080");
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
