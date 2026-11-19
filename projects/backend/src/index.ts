import cors from "@elysiajs/cors";
import { serverTiming } from "@elysiajs/server-timing";
import {
  AUTH_ROUTE,
  USER_FOLLOWING_ROUTE,
  USER_PINNED_SCORES_ROUTE,
  USER_PREFERENCES_ROUTE,
} from "@ssr/common/api-routes";
import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { isProduction } from "@ssr/common/utils/utils";
import { logger } from "@tqman/nice-logger";
import { stringify } from "devalue";
import { EmbedBuilder } from "discord.js";
import { Elysia, ValidationError, type AnyElysia } from "elysia";
import { helmet } from "elysia-helmet";
import { trace } from "elysia/trace";
import { websocket as websocketPlugin } from "elysia/websocket";
import { DiscordChannels, initDiscordBot, sendEmbedToChannel } from "./bot/bot";
import { registerGlobalErrorHandlers, reportErrorToDiscord } from "./common/discord/error-reporting";
import { getHttpErrorCode } from "./common/error-code";
import { profileEventLoop } from "./common/event-loop-profiler";
import AppController from "./controller/app/app.controller";
import AuthController from "./controller/auth/auth.controller";
import BeatLeaderController from "./controller/beatleader/beatleader.controller";
import BeatSaverController from "./controller/beatsaver/beatsaver.controller";
import LeaderboardController from "./controller/leaderboard/leaderboard.controller";
import MetricsController from "./controller/metrics/metrics.controller";
import PlayerRankingController from "./controller/player/player-ranking.controller";
import PlayerController from "./controller/player/player.controller";
import PlaylistController from "./controller/playlist/playlist.controller";
import RankedBatchController from "./controller/ranked-batch/ranked-batch.controller";
import RealmController from "./controller/realm/realm.controller";
import ScoresController from "./controller/scores/scores.controller";
import SuggestedMapsController from "./controller/suggested-maps/suggested-maps.controller";
import UserFollowingController from "./controller/user/user-following.controller";
import UserOverlaysController from "./controller/user/user-overlays.controller";
import UserPinnedScoresController from "./controller/user/user-pinned-scores.controller";
import UserPreferencesController from "./controller/user/user-preferences.controller";
import UserController from "./controller/user/user.controller";
import { runMigrations } from "./db/run-migrations";
import { EventsManager } from "./event/events-manager";
import { authCors } from "./plugins/auth-cors";
import { crons } from "./plugins/crons";
import { createHttpMetricsHooks } from "./plugins/http-metrics.hooks";
import { privateNetworkCors } from "./plugins/private-network-cors";
import { rateLimit } from "./plugins/rate-limit";
import { QueueManager } from "./queue/queue-manager";
import { AppService } from "./service/app/app.service";
import CacheService from "./service/infra/cache.service";
import MetricsService from "./service/infra/metrics.service";
import StorageService from "./service/infra/storage.service";
import { PlayerCacheLivenessService } from "./service/player/player-cache-liveness.service";
import PlaylistService from "./service/playlist/playlist.service";
import { SuggestedMapsService } from "./service/suggested-maps/suggested-maps.service";
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

if (env.PROFILE_EVENT_LOOP_SECONDS) {
  profileEventLoop(Number(env.PROFILE_EVENT_LOOP_SECONDS)).catch(error =>
    log.error("Failed to profile the event loop:", error)
  );
}

const httpMetricsHooks = createHttpMetricsHooks();

function registerControllers<TApp extends AnyElysia>(instance: TApp) {
  instance
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
    .use(RealmController)
    .use(RankedBatchController)
    .use(SuggestedMapsController);
  return instance;
}

const baseApp = new Elysia()
  .use(
    logger({
      enabled: !isProduction(),
      mode: "combined",
    })
  )
  .use(trace())
  .use(serverTiming())
  .use(crons)
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
  .use(authCors)
  .use(privateNetworkCors)
  .use(cors())
  .use(
    helmet({
      hsts: false,
      contentSecurityPolicy: false,
      dnsPrefetchControl: true,
    })
  );

export const app = registerControllers(baseApp);

new WebsocketManager();

app.use(websocketPlugin());

for (const websocket of WebsocketManager.getAll()) {
  app.ws(websocket.route, {
    open: ws => websocket.onOpen(ws),
    close: ws => websocket.onClose(ws),
  });
}

app.onStart(async () => {
  SuggestedMapsService.scheduleRefresh();
  EventsManager.getListeners().forEach(listener => {
    listener.onStart?.();
  });

  await PlayerCacheLivenessService.start();

  log.info("Listening on port http://localhost:8080");
  try {
    await initDiscordBot();
    sendEmbedToChannel(DiscordChannels.BACKEND_LOGS, new EmbedBuilder().setDescription("Backend started!"));
  } catch (error) {
    log.error("Failed to initialize the Discord bot:", error);
  }

  log.info("Registered routes:");
  for (const route of app.routes) {
    log.info(`${route.method} ${route.path}`);
  }

  new ScoreWebsockets();
  new BeatSaverWebsocket();
  new StorageService();

  new CacheService();
  new PlaylistService();

  EventsManager.registerListener(new QueueManager());
});

app.listen({
  port: 8080,
  idleTimeout: 120,
});

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
