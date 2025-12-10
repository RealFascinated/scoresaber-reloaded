import * as dotenv from "@dotenvx/dotenvx";
import cors from "@elysiajs/cors";
import { cron } from "@elysiajs/cron";
import { swagger } from "@elysiajs/swagger";
import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { logger } from "@tqman/nice-logger";
import { mongoose } from "@typegoose/typegoose";
import { EmbedBuilder } from "discord.js";
import { Elysia, ValidationError } from "elysia";
import { decorators } from "elysia-decorators";
import { helmet } from "elysia-helmet";
import Redis from "ioredis";
import SuperJSON from "superjson";
import { DiscordChannels, initDiscordBot, sendEmbedToChannel } from "./bot/bot";
import { getAppVersion } from "./common/app.util";
import AppController from "./controller/app.controller";
import BeatLeaderController from "./controller/beatleader.controller";
import BeatSaverController from "./controller/beatsaver.controller";
import CachedScoresController from "./controller/cached-scores.controller";
import FriendsController from "./controller/friends.controller";
import LeaderboardController from "./controller/leaderboard.controller";
import MedalsScoresController from "./controller/medals-scores.controller";
import MiniRankingController from "./controller/mini-ranking.controller";
import PlayerHistoryController from "./controller/player-history.controller";
import PlayerRankingController from "./controller/player-ranking.controller";
import PlayerScoreHistoryController from "./controller/player-score-history.controller";
import PlayerSearchController from "./controller/player-search.controller";
import PlayerController from "./controller/player.controller";
import PlaylistController from "./controller/playlist.controller";
import ReplayController from "./controller/replay.controller";
import ScoresController from "./controller/scores.controller";
import StatisticsController from "./controller/statistics.controller";
import TopScoresController from "./controller/top-scores.controller";
import { EventsManager } from "./event/events-manager";
import { metricsPlugin } from "./plugins/metrics.plugin";
import { QueueManager } from "./queue/queue-manager";
import BeatSaverService from "./service/beatsaver.service";
import CacheService from "./service/cache.service";
import { LeaderboardService } from "./service/leaderboard/leaderboard.service";
import MetricsService from "./service/metrics.service";
import MinioService from "./service/minio.service";
import { PlayerService } from "./service/player/player.service";
import PlaylistService from "./service/playlist/playlist.service";
import { ScoreService } from "./service/score/score.service";
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

// Print slow queries
mongoose.connection.on("query", (event) => {
  if (event.milliseconds > 100) {
    const collection = event.query?.collectionName || "unknown";
    const operation = event.query?.op || "unknown";
    const query = event.query?.filter || event.query?.query || {};
    const queryString = JSON.stringify(query, null, 2);
    
    Logger.warn(
      `Slow query detected: ${collection}.${operation} took ${event.milliseconds}ms`,
      queryString
    );

    sendEmbedToChannel(
      DiscordChannels.BACKEND_LOGS,
      new EmbedBuilder()
        .setTitle("🐌 Slow Query Detected")
        .setDescription(`**${collection}.${operation}** took **${event.milliseconds}ms**`)
        .addFields({
          name: "Query",
          value: `\`\`\`json\n${queryString.length > 1000 ? queryString.substring(0, 1000) + "..." : queryString}\n\`\`\``,
        })
        .setColor(0xffaa00)
        .setTimestamp()
    ).catch((error) => {
      Logger.error("Failed to send slow query to Discord:", error);
    });
  }
});

Logger.info("Connected to MongoDB :)");

Logger.info("Testing Redis connection...");
export const redisClient = new Redis(env.REDIS_URL);
Logger.info("Connected to Redis :)");

export const app = new Elysia()
  .use(
    swagger({
      autoDarkMode: false,
      version: await getAppVersion(),
      documentation: {
        info: {
          title: "SSR API",
          description: "API for the SSR Backend",
          version: await getAppVersion(),
        },
      },
      scalarConfig: {
        defaultOpenAllTags: true,
      },
    })
  )
  .use(
    cron({
      name: "player-statistics-tracker-cron",
      // pattern: "*/1 * * * *", // Every 1 minute
      pattern: "59 23 * * *", // Every day at 23:59
      timezone: "Europe/London", // UTC time
      protect: true,
      run: async () => {
        const before = Date.now();
        await sendEmbedToChannel(
          DiscordChannels.BACKEND_LOGS,
          new EmbedBuilder().setDescription(`Updating player statistics...`)
        );
        await PlayerService.updatePlayerStatistics();
        await sendEmbedToChannel(
          DiscordChannels.BACKEND_LOGS,
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
      // pattern: "*/1 * * * *", // Every minute
      pattern: "30 */2 * * *", // Every 2 hours at 30 minutes ex: 00:30, 02:30, 04:30, etc
      timezone: "Europe/London", // UTC time
      protect: true,
      run: async () => {
        await LeaderboardService.refreshRankedLeaderboards();
        await LeaderboardService.refreshQualifiedLeaderboards();
      },
    })
  )
  .use(
    cron({
      name: "refresh-medal-scores",
      // pattern: "*/1 * * * *", // Every minute
      pattern: "0 23 * * *", // Every day at 23:00
      timezone: "Europe/London", // UTC time
      protect: true,
      run: async () => {
        await ScoreService.refreshMedalScores(); // Refresh medal scores
        await PlayerService.updatePlayerGlobalMedalCounts(); // Update player global medal counts and ranks
      },
    })
  )
  .use(
    cron({
      name: "update-ranking-queue-playlist",
      pattern: "0 */2 * * *", // Every 2 hours at 00:00, 02:00, 04:00, etc
      timezone: "Europe/London",
      protect: true,
      run: async () => {
        const playlist = await PlaylistService.createRankingQueuePlaylist();
        await PlaylistService.updatePlaylist("scoresaber-ranking-queue-maps", {
          title: playlist.title,
          image: playlist.image,
          songs: playlist.songs,
        });
      },
    })
  );

app.use(metricsPlugin());

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

  let status: number | undefined = undefined;
  if (typeof error === "object" && error !== null && "status" in error) {
    status = (error as { status?: number }).status;
  }

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

  if (code === 500) {
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
 * Global toggle for SuperJSON for all responses
 */
app.onAfterHandle(({ request, response }) => {
  const url = new URL(request.url.toLowerCase());
  if (url.searchParams.get("superjson") === "true") {
    return SuperJSON.stringify(response);
  }
  return response;
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
      BeatLeaderController,
      FriendsController,
      MiniRankingController,
      PlayerHistoryController,
      PlayerScoreHistoryController,
      TopScoresController,
      CachedScoresController,
      PlayerSearchController,
      PlayerRankingController,
      MedalsScoresController,
    ],
  })
);

app.onStart(async () => {
  EventsManager.getListeners().forEach(listener => {
    listener.onStart?.();
  });

  Logger.info("Listening on port http://localhost:8080");
  await initDiscordBot();
  sendEmbedToChannel(
    DiscordChannels.BACKEND_LOGS,
    new EmbedBuilder().setDescription("Backend started!")
  );

  // Log all registered routes
  Logger.info("Registered routes:");
  for (const route of app.routes) {
    Logger.info(`${route.method} ${route.path}`);
  }

  // Must be registered first
  new ScoreWebsockets();
  new BeatSaverWebsocket();
  new MinioService();

  new CacheService();
  new StatisticsService();
  new ScoreService();
  new PlaylistService();

  EventsManager.registerListener(new QueueManager());
  EventsManager.registerListener(new MetricsService());

  // Scrape beatsaver maps
  (async () => {
    const redisKey = "beatsaver:scrape:beforeDate";

    let shouldScrape = true;
    const redisValue = await redisClient.get(redisKey);
    let beforeDate = redisValue ? new Date(redisValue) : new Date();
    Logger.info(`Starting to scrape beatsaver maps before ${beforeDate.toISOString()}...`);

    while (shouldScrape) {
      const latestMaps = await ApiServiceRegistry.getInstance()
        .getBeatSaverService()
        .lookupLatestMaps(false, 100, {
          before: beforeDate,
        });
      if (latestMaps == undefined || latestMaps.docs.length === 0) {
        Logger.info(`No maps found before ${beforeDate.toISOString()}!`);
        shouldScrape = false;
        continue;
      }

      const sortedMaps = latestMaps.docs.sort(
        (a, b) => new Date(a.uploaded).getTime() - new Date(b.uploaded).getTime()
      );
      const oldestDate = new Date(sortedMaps[0].uploaded);
      beforeDate = oldestDate;

      // Save the maps
      for (const map of sortedMaps) {
        await BeatSaverService.saveMap(map);
      }

      // Save progress to Redis
      await redisClient.set(redisKey, beforeDate.toISOString());

      // If we got fewer than 100 maps, we've reached the end
      if (latestMaps.docs.length < 100) {
        shouldScrape = false;
        continue;
      }
      await Bun.sleep(500); // 500ms to avoid touching their server inappropriately

      Logger.info(`Scraped ${latestMaps.docs.length} maps before ${beforeDate.toISOString()}!`);
    }
  })();
});

app.listen({
  port: 8080,
  idleTimeout: 120, // 2 minutes
});

// Graceful shutdown handlers
let isShuttingDown = false;
let forceExitTimeout: NodeJS.Timeout | null = null;

const gracefulShutdown = async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  Logger.info("Starting graceful shutdown...");

  try {
    await app.stop();
    Logger.info("Server stopped accepting new requests");

    await sendEmbedToChannel(
      DiscordChannels.BACKEND_LOGS,
      new EmbedBuilder().setDescription("Backend shutting down...")
    );

    Logger.info("Stopping all services...");
    for (const listener of EventsManager.getListeners()) {
      await listener.onStop?.();
    }

    await mongoose.disconnect();
    Logger.info("MongoDB connection closed");

    if (forceExitTimeout) clearTimeout(forceExitTimeout);

    Logger.info("Shutdown complete");
    process.exit(0);
  } catch (error) {
    Logger.error("Error during shutdown:", error);
    process.exit(1);
  }
};

const handleSignal = (signal: string) => {
  if (isShuttingDown) return;

  Logger.info(`Received ${signal}`);
  gracefulShutdown();

  if (!forceExitTimeout) {
    forceExitTimeout = setTimeout(() => {
      Logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  }
};

process.removeAllListeners("SIGTERM").removeAllListeners("SIGINT");
process.on("SIGTERM", () => handleSignal("SIGTERM"));
process.on("SIGINT", () => handleSignal("SIGINT"));
