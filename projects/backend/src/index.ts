import cors from "@elysiajs/cors";
import { serverTiming } from "@elysiajs/server-timing";
import {
  AUTH_ROUTE,
  USER_FOLLOWING_ROUTE,
  USER_PINNED_SCORES_ROUTE,
  USER_PREFERENCES_ROUTE,
} from "@ssr/common/api-routes";
import Logger from "@ssr/common/logger";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { isProduction } from "@ssr/common/utils/utils";
import { logger } from "@tqman/nice-logger";
import { stringify } from "devalue";
import { EmbedBuilder } from "discord.js";
import { Elysia, ValidationError } from "elysia";
import { helmet } from "elysia-helmet";
import { trace } from "elysia/trace";
import { websocket as websocketPlugin } from "elysia/websocket";
import { DiscordChannels, initDiscordBot, sendEmbedToChannel } from "./bot/bot";
import { getAppVersion } from "./common/app.util";
import { cron } from "./common/cron";
import { registerGlobalErrorHandlers, reportErrorToDiscord } from "./common/discord/error-reporting";
import { getHttpErrorCode } from "./common/error-code";
import AppController from "./controller/app/app.controller";
import AuthController from "./controller/auth/auth.controller";
import BeatLeaderController from "./controller/beatleader/beatleader.controller";
import BeatSaverController from "./controller/beatsaver/beatsaver.controller";
import LeaderboardController from "./controller/leaderboard/leaderboard.controller";
import MetricsController from "./controller/metrics/metrics.controller";
import PlayerRankingController from "./controller/player/player-ranking.controller";
import PlayerController from "./controller/player/player.controller";
import PlaylistController from "./controller/playlist/playlist.controller";
import RealmController from "./controller/realm/realm.controller";
import ScoresController from "./controller/scores/scores.controller";
import UserFollowingController from "./controller/user/user-following.controller";
import UserOverlaysController from "./controller/user/user-overlays.controller";
import UserPinnedScoresController from "./controller/user/user-pinned-scores.controller";
import UserPreferencesController from "./controller/user/user-preferences.controller";
import UserController from "./controller/user/user.controller";
import { runMigrations } from "./db/run-migrations";
import { EventsManager } from "./event/events-manager";
import { authCors } from "./plugins/auth-cors";
import { createHttpMetricsHooks } from "./plugins/http-metrics.hooks";
import { rateLimit } from "./plugins/rate-limit";
import { QueueManager } from "./queue/queue-manager";
import { ScoreSaberMedalsRepository } from "./repositories/scoresaber-medals.repository";
import { TableCountsRepository } from "./repositories/table-counts.repository";
import { AppService } from "./service/app/app.service";
import CacheService from "./service/infra/cache.service";
import MetricsService from "./service/infra/metrics.service";
import StorageService from "./service/infra/storage.service";
import { LeaderboardRankedSyncNotificationsService } from "./service/leaderboard/leaderboard-ranked-batch-notifications.service";
import { LeaderboardRankedSyncService } from "./service/leaderboard/leaderboard-ranked-sync.service";
import { PlayerMedalsService } from "./service/medals/player-medals.service";
import { PlayerCacheLivenessService } from "./service/player/player-cache-liveness.service";
import { PlayerHistoryService } from "./service/player/player-history.service";
import PlaylistService from "./service/playlist/playlist.service";
import { ScoreEventService } from "./service/score-event/score-event.service";
import { PlayerPlayedStreakService } from "./service/streaks/player-streaks.service";
import { BeatSaverWebsocket } from "./websocket/listeners/beatsaver-websocket";
import { ScoreWebsockets } from "./websocket/listeners/platform-score-handlers";
import { WebsocketManager } from "./websocket/websocket-manager";

const log = Logger.withTopic("SSR Backend");

registerGlobalErrorHandlers();

log.info("Starting SSR Backend...");

try {
  log.info("Running database migrations...");
  await runMigrations();
  log.info("Completed database migrations.");
} catch (error) {
  log.error("Database migration failed:", error);
  reportErrorToDiscord("Database migration failed", error);
  process.exit(1);
}

new EventsManager();
new MetricsService();
AppService.startSampling();

const httpMetricsHooks = createHttpMetricsHooks();
const appVersion = await getAppVersion();

export const app = new Elysia()
  .use(
    logger({
      enabled: !isProduction(),
      mode: "combined",
    })
  )
  .use(trace())
  .use(serverTiming())
  .use(
    cron({
      name: "player-statistics-tracker-cron",
      // pattern: "*/1 * * * *", // Every 1 minute
      pattern: "59 23 * * *", // Every day at 23:59
      timezone: "UTC",
      protect: true,
      run: async () => {
        const before = Date.now();
        try {
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
        } catch (error) {
          log.error("player-statistics-tracker-cron failed:", error);
          reportErrorToDiscord("Cron: player-statistics-tracker", error);
        }
      },
    })
  )
  .use(
    cron({
      name: "refresh-leaderboards-cron",
      // pattern: "*/1 * * * *", // Every minute
      pattern: "30 */2 * * *", // Every 2 hours at 30 minutes ex: 00:30, 02:30, 04:30, etc
      timezone: "UTC",
      protect: true,
      run: async () => {
        try {
          const updates = await LeaderboardRankedSyncService.refreshRankedLeaderboards();
          // Isolated so a failed Discord batch notification (paste upload,
          // message or playlist send) is reported but never aborts the rest of
          // the sync.
          try {
            await LeaderboardRankedSyncNotificationsService.handleRankedBatch(updates);
          } catch (error) {
            log.error("refresh-leaderboards-cron ranked batch notification failed:", error);
            reportErrorToDiscord("Cron: refresh-leaderboards (ranked batch notification)", error);
          }
          await LeaderboardRankedSyncService.refreshQualifiedLeaderboards();
        } catch (error) {
          log.error("refresh-leaderboards-cron failed:", error);
          reportErrorToDiscord("Cron: refresh-leaderboards", error);
        }
      },
    })
  )
  .use(
    cron({
      name: "refresh-medal-scores",
      pattern: "*/10 * * * *", // Every 10 minutes
      timezone: "UTC",
      protect: true,
      run: async () => {
        try {
          await ScoreSaberMedalsRepository.refreshMaterializedMedalRanks();
        } catch (error) {
          log.error("refresh-medal-scores cron failed:", error);
          reportErrorToDiscord("Cron: refresh-medal-scores", error);
        }
      },
    })
  )
  .use(
    cron({
      name: "nightly-global-medal-refresh",
      // pattern: "*/1 * * * *", // Every minute
      pattern: "0 22 * * *", // Every day at 22:00
      timezone: "UTC",
      protect: true,
      run: async () => {
        const before = Date.now();
        try {
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
        } catch (error) {
          log.error("nightly-global-medal-refresh cron failed:", error);
          reportErrorToDiscord("Cron: nightly-global-medal-refresh", error);
        }
      },
    })
  )
  .use(
    cron({
      name: "leaderboard-updates",
      pattern: "0 * * * *", // Every 1 hour
      timezone: "UTC",
      protect: true,
      run: async () => {
        try {
          await ScoreEventService.updateTrendingLeaderboards();
          await ScoreEventService.updateLeaderboardDailyPlays();
        } catch (error) {
          log.error("leaderboard-updates cron failed:", error);
          reportErrorToDiscord("Cron: leaderboard-updates", error);
        }
      },
    })
  )
  .use(
    cron({
      name: "reconcile-table-counts",
      pattern: "0 3 * * *", // Every day at 03:00 UTC
      timezone: "UTC",
      protect: true,
      run: async () => {
        try {
          await TableCountsRepository.reconcile();
        } catch (error) {
          log.error("reconcile-table-counts cron failed:", error);
          reportErrorToDiscord("Cron: reconcile-table-counts", error);
        }
      },
    })
  )
  .use(
    cron({
      name: "expire-broken-streaks",
      // pattern: "*/1 * * * *", // Every minute
      pattern: "0 0 * * *", // Every day at 00:00
      timezone: "UTC",
      protect: true,
      run: async () => {
        try {
          await PlayerPlayedStreakService.expireBrokenStreaks();
        } catch (error) {
          log.error("expire-broken-streaks cron failed:", error);
          reportErrorToDiscord("Cron: expire-broken-streaks", error);
        }
      },
    })
  )
  .use(
    rateLimit({
      max: 300,
      windowMs: 60_000,
      routes: {
        "/player/refresh/": 10,
        "/beatleader/": 30,
        [`${AUTH_ROUTE}/`]: 30,
        [USER_PREFERENCES_ROUTE]: 60,
        [USER_FOLLOWING_ROUTE]: 60,
        [USER_PINNED_SCORES_ROUTE]: 60,
      },
    })
  )
  .onRequest(httpMetricsHooks.onRequest)
  .onError("global", ({ error, request, path, route }) => {
    const code = getHttpErrorCode(error);
    // Return default error for type validation. JSON round-trip drops Elysia class instances (e.g. RequestParams in `value`) so mapResponse's devalue can serialize.
    if (code === "VALIDATION") {
      return JSON.parse(JSON.stringify((error as ValidationError).all));
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
      reportErrorToDiscord("HTTP 500", error, `${request.method} ${path}\nRoute: ${route}\nCode: ${code}`);
    }

    // Never expose internals (e.g. SQL and its parameters) for server errors
    const errorMessage =
      status === 500
        ? "Internal server error"
        : typeof error === "object" && error !== null && "message" in error
          ? (error as { message?: unknown }).message
          : undefined;

    return {
      ...((status && { statusCode: status }) || { status: code }),
      ...(errorMessage != code && typeof errorMessage === "string" && { message: errorMessage }),
      timestamp: new Date().toISOString(),
    };
  })
  .onAfterHandle(async ({ request, route, responseValue, set }) => {
    await httpMetricsHooks.onAfterHandle({ request, route, response: responseValue, set });
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
  .use(authCors) // Must be before cors()
  .use(cors())
  .use(
    helmet({
      hsts: false, // Disable HSTS
      contentSecurityPolicy: false, // Disable CSP
      dnsPrefetchControl: true, // Enable DNS prefetch
    })
  )
  .use(AppController)
  .use(AuthController)
  .use(UserPreferencesController)
  .use(UserController)
  .use(UserFollowingController)
  .use(UserPinnedScoresController)
  .use(UserOverlaysController)
  .use(PlayerController)
  .use(ScoresController)
  .use(LeaderboardController)
  .use(PlaylistController)
  .use(BeatSaverController)
  .use(BeatLeaderController)
  .use(PlayerRankingController)
  .use(MetricsController)
  .use(RealmController);

// OpenAPI docs (/swagger) are disabled: @elysiajs/openapi does not support Elysia 2 yet
new WebsocketManager();

app.use(websocketPlugin());

for (const websocket of WebsocketManager.getAll()) {
  app.ws(websocket.route, {
    open: ws => websocket.onOpen(ws),
    close: ws => websocket.onClose(ws),
  });
}

app.onStart(async () => {
  EventsManager.getListeners().forEach(listener => {
    listener.onStart?.();
  });

  // Before the score websockets start, so a stale cache is dropped before it can be served
  await PlayerCacheLivenessService.start();

  log.info("Listening on port http://localhost:8080");
  try {
    await initDiscordBot();
    sendEmbedToChannel(DiscordChannels.BACKEND_LOGS, new EmbedBuilder().setDescription("Backend started!"));
  } catch (error) {
    // A Discord outage must not stop the rest of the services from starting
    log.error("Failed to initialize the Discord bot:", error);
  }

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
    await PlayerCacheLivenessService.stop();
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
    reportErrorToDiscord("Shutdown error", error);
    clearTimeout(forceExit);
    process.exit(1);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
