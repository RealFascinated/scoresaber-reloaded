import * as dotenv from "@dotenvx/dotenvx";
import cors from "@elysiajs/cors";
import { cron } from "@elysiajs/cron";
import { openapi } from "@elysiajs/openapi";
import { fromTypes } from "@elysiajs/openapi/gen";
import { AdditionalReferences } from "@elysiajs/openapi/types";
import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { formatDuration, TimeUnit } from "@ssr/common/utils/time-utils";
import { isProduction } from "@ssr/common/utils/utils";
import { logger } from "@tqman/nice-logger";
import { mongoose } from "@typegoose/typegoose";
import { EmbedBuilder } from "discord.js";
import { Elysia, ValidationError } from "elysia";
import { helmet } from "elysia-helmet";
import fs from "fs";
import Redis from "ioredis";
import SuperJSON from "superjson";
import { z } from "zod";
import { DiscordChannels, initDiscordBot, sendEmbedToChannel } from "./bot/bot";
import { getAppVersion } from "./common/app.util";
import AppController from "./controller/app.controller";
import BeatLeaderController from "./controller/beatleader.controller";
import BeatSaverController from "./controller/beatsaver.controller";
import LeaderboardController from "./controller/leaderboard.controller";
import PlayerRankingController from "./controller/player-ranking.controller";
import PlayerController from "./controller/player.controller";
import PlaylistController from "./controller/playlist.controller";
import ScoresController from "./controller/scores.controller";
import StatisticsController from "./controller/statistics.controller";
import { EventsManager } from "./event/events-manager";
import { metricsPlugin } from "./plugins/metrics.plugin";
import { QueueManager } from "./queue/queue-manager";
import BeatSaverService from "./service/beatsaver.service";
import CacheService from "./service/cache.service";
import { LeaderboardNotificationsService } from "./service/leaderboard/leaderboard-notifications.service";
import { LeaderboardRankingService } from "./service/leaderboard/leaderboard-ranking.service";
import MetricsService from "./service/metrics.service";
import MinioService from "./service/minio.service";
import { PlayerHistoryService } from "./service/player/player-history.service";
import { PlayerMedalsService } from "./service/player/player-medals.service";
import PlaylistService from "./service/playlist/playlist.service";
import { MedalScoresService } from "./service/score/medal-scores.service";
import StatisticsService from "./service/statistics.service";
import { BeatSaverWebsocket } from "./websocket/beatsaver-websocket";
import { ScoreWebsockets } from "./websocket/score-websockets";

Logger.info("Starting SSR Backend...");

// Load .env file
if (fs.existsSync(".env")) {
  dotenv.config({
    path: ".env",
    override: true,
  });
}

new EventsManager();

try {
  Logger.info("Connecting to MongoDB...");
  await mongoose.connect(env.MONGO_CONNECTION_STRING);
  Logger.info("Connected to MongoDB :)");
} catch (error) {
  Logger.error("Failed to connect to MongoDB:", error);
  process.exit(1);
}

Logger.info("Testing Redis connection...");
export const redisClient = new Redis(env.REDIS_URL);
Logger.info("Connected to Redis :)");

let typeReferences: AdditionalReferences | undefined;
if (isProduction()) {
  Logger.info("Generating type references...");
  fromTypes("src/index.ts", {
    projectRoot: process.cwd(),
    overrideOutputPath: (tempDir: string) => `${tempDir}/dist/backend/src/index.d.ts`,
    silent: false,
    debug: true,
  })();
}

export const app = new Elysia()
  .use(
    logger({
      enabled: !isProduction(),
      mode: "combined",
    })
  )
  .use(
    openapi({
      path: "/swagger",
      references: typeReferences,
      documentation: {
        info: {
          title: "SSR Backend",
          description: "The API for ScoreSaber Reloaded!",
          version: await getAppVersion(),
        },
        servers: [
          {
            url: env.NEXT_PUBLIC_API_URL,
            description: isProduction() ? "Production" : "Development",
          },
        ],
      },
      scalar: {
        defaultOpenAllTags: true,
        expandAllModelSections: true,
        expandAllResponses: true,
      },
      mapJsonSchema: {
        zod: z.toJSONSchema,
      },
    })
  )
  .use(
    cron({
      name: "player-statistics-tracker-cron",
      // pattern: "*/1 * * * *", // Every 1 minute
      pattern: "59 23 * * *", // Every day at 23:59
      timezone: "Europe/London",
      protect: true,
      run: async () => {
        const before = Date.now();
        await sendEmbedToChannel(
          DiscordChannels.BACKEND_LOGS,
          new EmbedBuilder().setDescription(`Updating player statistics...`)
        );
        await PlayerHistoryService.updatePlayerStatistics();
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
      timezone: "Europe/London",
      protect: true,
      run: async () => {
        await LeaderboardNotificationsService.logLeaderboardUpdates(
          await LeaderboardRankingService.refreshRankedLeaderboards()
        );
        await LeaderboardRankingService.refreshQualifiedLeaderboards();
      },
    })
  )
  .use(
    cron({
      name: "refresh-medal-scores",
      // pattern: "*/1 * * * *", // Every minute
      pattern: "0 20 * * *", // Every day at 20:00
      timezone: "Europe/London",
      protect: true,
      run: async () => {
        await MedalScoresService.rescanMedalScores(); // Refresh medal scores
        await PlayerMedalsService.updatePlayerGlobalMedalCounts(); // Update player global medal counts and ranks
      },
    })
  )
  .use(
    cron({
      name: "scrape-beatsaver-maps",
      pattern: "0 8 * * *", // Every day at 08:00
      timezone: "Europe/London",
      protect: true,
      run: async () => {
        let shouldScrape = true;
        let beforeDate = new Date();
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
          beforeDate = new Date(sortedMaps[0].uploaded);

          // Save the maps
          for (const map of sortedMaps) {
            await BeatSaverService.saveMap(map);
          }

          // No more maps to scrape
          if (latestMaps.docs.length == 0) {
            shouldScrape = false;
            continue;
          }
          await Bun.sleep(TimeUnit.toMillis(TimeUnit.Minute, 1)); // avoid touching their server inappropriately

          Logger.info(`Scraped ${latestMaps.docs.length} maps before ${beforeDate.toISOString()}!`);
        }
      },
    })
  )
  .use(metricsPlugin())
  .onError({ as: "global" }, ({ code, error }) => {
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
  })
  .onAfterHandle(({ request, response, set }) => {
    if (request.headers.get("accept") === "application/superjson") {
      set.headers["content-type"] = "application/superjson";
      return SuperJSON.stringify(response);
    }

    if (response instanceof Object && response !== null) {
      set.headers["content-type"] = "application/json";
      return JSON.stringify(response);
    }
  })
  .use(cors())
  .use(
    helmet({
      hsts: false, // Disable HSTS
      contentSecurityPolicy: false, // Disable CSP
      dnsPrefetchControl: true, // Enable DNS prefetch
    })
  )
  .use(AppController)
  .use(PlayerController)
  .use(ScoresController)
  .use(LeaderboardController)
  .use(StatisticsController)
  .use(PlaylistController)
  .use(BeatSaverController)
  .use(BeatLeaderController)
  .use(PlayerRankingController);

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
  new PlaylistService();

  EventsManager.registerListener(new QueueManager());
  EventsManager.registerListener(new MetricsService());
});

app.listen({
  port: 8080,
  idleTimeout: 120, // 2 minutes
});

// Graceful shutdown
let isShuttingDown = false;

const gracefulShutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  Logger.info(`Received ${signal}, starting graceful shutdown...`);

  const forceExit = setTimeout(() => {
    Logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);

  try {
    await app.stop();
    Logger.info("Server stopped accepting new requests");

    await sendEmbedToChannel(
      DiscordChannels.BACKEND_LOGS,
      new EmbedBuilder().setDescription("Backend shutting down...")
    );

    Logger.info("Stopping all services...");
    for (const listener of EventsManager.getListeners()) {
      try {
        await listener.onStop?.();
      } catch (error) {
        Logger.warn(`Error stopping service ${listener.constructor.name}:`, error);
      }
    }

    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      Logger.info("MongoDB connection closed");
    }

    clearTimeout(forceExit);
    Logger.info("Shutdown complete");
    process.exit(0);
  } catch (error) {
    Logger.error("Error during shutdown:", error);
    clearTimeout(forceExit);
    process.exit(1);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
