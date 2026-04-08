import cors from "@elysiajs/cors";
import { cron } from "@elysiajs/cron";
import { openapi } from "@elysiajs/openapi";
import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { isProduction } from "@ssr/common/utils/utils";
import { logger } from "@tqman/nice-logger";
import { timingSafeEqual } from "crypto";
import { stringify } from "devalue";
import { EmbedBuilder } from "discord.js";
import { Elysia, ValidationError } from "elysia";
import { helmet } from "elysia-helmet";
import { z } from "zod";
import { DiscordChannels, initDiscordBot, sendEmbedToChannel } from "./bot/bot";
import { getAppVersion } from "./common/app.util";
import AppController from "./controller/app/app.controller";
import BeatLeaderController from "./controller/beatleader/beatleader.controller";
import BeatSaverController from "./controller/beatsaver/beatsaver.controller";
import LeaderboardController from "./controller/leaderboard/leaderboard.controller";
import PlayerRankingController from "./controller/player/player-ranking.controller";
import PlayerController from "./controller/player/player.controller";
import PlaylistController from "./controller/playlist/playlist.controller";
import ScoresController from "./controller/scores/scores.controller";
import { runMigrations } from "./db/run-migrations";
import { EventsManager } from "./event/events-manager";
import { createHttpMetricsHooks } from "./plugins/http-metrics.hooks";
import { QueueManager } from "./queue/queue-manager";
import { ScoreSaberMedalsRepository } from "./repositories/scoresaber-medals.repository";
import CacheService from "./service/infra/cache.service";
import MetricsService, { prometheusRegistry } from "./service/infra/metrics.service";
import StorageService from "./service/infra/storage.service";
import { LeaderboardRankedSyncNotificationsService } from "./service/leaderboard/leaderboard-ranked-batch-notifications.service";
import { LeaderboardRankedSyncService } from "./service/leaderboard/leaderboard-ranked-sync.service";
import { PlayerMedalsService } from "./service/medals/player-medals.service";
import { PlayerHistoryService } from "./service/player/player-history.service";
import PlaylistService from "./service/playlist/playlist.service";
import { ScoreEventService } from "./service/score-event/score-event.service";
import { BeatSaverWebsocket } from "./websocket/listeners/beatsaver-websocket";
import { ScoreWebsockets } from "./websocket/listeners/platform-score-handlers";
import { WebsocketManager } from "./websocket/websocket-manager";
import { TableCountsRepository } from "./repositories/table-counts.repository";

const log = Logger.withTopic("SSR Backend");

log.info("Starting SSR Backend...");

try {
  log.info("Running database migrations...");
  await runMigrations();
  log.info("Completed database migrations.");
} catch (error) {
  log.error("Database migration failed:", error);
  process.exit(1);
}

new EventsManager();
new MetricsService();

const httpMetricsHooks = createHttpMetricsHooks();

export const app = new Elysia()
  .use(
    logger({
      enabled: true,
      mode: "combined",
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
        await LeaderboardRankedSyncNotificationsService.handleRankedBatch(
          await LeaderboardRankedSyncService.refreshRankedLeaderboards()
        );
        await LeaderboardRankedSyncService.refreshQualifiedLeaderboards();
      },
    })
  )
  .use(
    cron({
      name: "refresh-medal-scores",
      pattern: "*/10 * * * *", // Every 10 minutes
      timezone: "Europe/London",
      protect: true,
      run: async () => {
        await ScoreSaberMedalsRepository.refreshMaterializedMedalRanks();
      },
    })
  )
  .use(
    cron({
      name: "nightly-global-medal-refresh",
      // pattern: "*/1 * * * *", // Every minute
      pattern: "0 22 * * *", // Every day at 22:00
      timezone: "Europe/London",
      protect: true,
      run: async () => {
        const before = Date.now();
        await sendEmbedToChannel(
          DiscordChannels.BACKEND_LOGS,
          new EmbedBuilder()
            .setTitle("Nightly global medal refresh")
            .setDescription("Starting full recompute of score medals and account sync…")
        );
        await PlayerMedalsService.recomputeMedalsFromScoresAndRefreshAccounts();
        await sendEmbedToChannel(
          DiscordChannels.BACKEND_LOGS,
          new EmbedBuilder()
            .setTitle("Nightly global medal refresh")
            .setDescription(`Finished in ${formatDuration(Date.now() - before)}.`)
        );
      },
    })
  )
  .use(
    cron({
      name: "leaderboard-updates",
      pattern: "0 * * * *", // Every 1 hour
      timezone: "Europe/London",
      protect: true,
      run: async () => {
        await ScoreEventService.updateTrendingLeaderboards();
        await ScoreEventService.updateLeaderboardDailyPlays();
      },
    })
  )
  .use(
    cron({
      name: "refresh-table-counts",
      pattern: "*/5 * * * *", // Every 5 minutes
      timezone: "Europe/London",
      protect: true,
      run: async () => {
        await TableCountsRepository.refreshConcurrently();
      },
    })
  )
  .onRequest(httpMetricsHooks.onRequest)
  .onError({ as: "global" }, ({ code, error }) => {
    // Return default error for type validation. JSON round-trip drops Elysia class instances (e.g. RequestParams in `value`) so mapResponse's devalue can serialize.
    if (code === "VALIDATION") {
      return JSON.parse(JSON.stringify((error as ValidationError).all));
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

    if (status === 500) {
      log.error("Internal server error:", error);
    }

    const errorMessage =
      typeof error === "object" && error !== null && "message" in error
        ? (error as { message?: unknown }).message
        : undefined;

    return {
      ...((status && { statusCode: status }) || { status: code }),
      ...(errorMessage != code && typeof errorMessage === "string" && { message: errorMessage }),
      timestamp: new Date().toISOString(),
    };
  })
  .onAfterHandle(async ({ request, route, response, set }) => {
    await httpMetricsHooks.onAfterHandle({ request, route, response, set });
  })
  .mapResponse(({ request, responseValue }) => {
    const ResponseCtor = (globalThis as unknown as { Response?: typeof Response }).Response;
    if (ResponseCtor && responseValue instanceof ResponseCtor) {
      return;
    }

    if (request.headers.get("accept") === "application/devalue") {
      return new Response(stringify(responseValue), {
        headers: { "content-type": "application/devalue" },
      });
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
  .get(
    "/metrics",
    async ({ headers, set }) => {
      // Validate Bearer token (skip in development)
      if (isProduction()) {
        const authHeader = headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          set.status = 401;
          return { error: "Unauthorized" };
        }

        const token = authHeader.substring(7); // Remove "Bearer " prefix

        const expectedToken = env.PROMETHEUS_AUTH_TOKEN;
        if (typeof expectedToken !== "string") {
          set.status = 500;
          return { error: "Server misconfigured" };
        }

        const tokenBuf = Buffer.from(token);
        const expectedBuf = Buffer.from(expectedToken);
        if (tokenBuf.length !== expectedBuf.length || !timingSafeEqual(tokenBuf, expectedBuf)) {
          set.status = 401;
          return { error: "Unauthorized" };
        }
      }

      // Export Prometheus metrics
      set.headers["content-type"] = "text/plain; version=0.0.4; charset=utf-8";
      return await prometheusRegistry.metrics();
    },
    {
      detail: {
        description: "Prometheus metrics endpoint (requires Bearer token authentication in production)",
        tags: [],
      },
    }
  )
  .use(AppController)
  .use(PlayerController)
  .use(ScoresController)
  .use(LeaderboardController)
  .use(PlaylistController)
  .use(BeatSaverController)
  .use(BeatLeaderController)
  .use(PlayerRankingController)
  .use(
    openapi({
      path: "/swagger",
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
  );

new WebsocketManager();

for (const websocket of WebsocketManager.getAll()) {
  app.ws(websocket.route, {
    open: ws => websocket.onOpen(ws.raw),
    close: ws => websocket.onClose(ws.raw),
  });
}

app.onStart(async () => {
  EventsManager.getListeners().forEach(listener => {
    listener.onStart?.();
  });

  log.info("Listening on port http://localhost:8080");
  await initDiscordBot();
  sendEmbedToChannel(DiscordChannels.BACKEND_LOGS, new EmbedBuilder().setDescription("Backend started!"));

  // Log all registered routes
  log.info("Registered routes:");
  for (const route of app.routes) {
    log.info(`${route.method} ${route.path}`);
  }

  // Must be registered first
  new ScoreWebsockets();
  new BeatSaverWebsocket();
  new StorageService();

  new CacheService();
  new PlaylistService();

  EventsManager.registerListener(new QueueManager());
});

app.listen({
  port: 8080,
  idleTimeout: 120, // 2 minutes
});

// Graceful shutdown
let isShuttingDown = false;

const gracefulShutdown = async (signal: string) => {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  log.info(`Received ${signal}, starting graceful shutdown...`);

  const forceExit = setTimeout(() => {
    log.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);

  try {
    await app.stop();
    log.info("Server stopped accepting new requests");

    await sendEmbedToChannel(
      DiscordChannels.BACKEND_LOGS,
      new EmbedBuilder().setDescription("Backend shutting down...")
    );

    log.info("Stopping all services...");
    MetricsService.cleanup();
    for (const listener of EventsManager.getListeners()) {
      try {
        await listener.onStop?.();
      } catch (error) {
        log.warn(`Error stopping service ${listener.constructor.name}:`, error);
      }
    }

    clearTimeout(forceExit);
    log.info("Shutdown complete");
    process.exit(0);
  } catch (error) {
    log.error("Error during shutdown:", error);
    clearTimeout(forceExit);
    process.exit(1);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
