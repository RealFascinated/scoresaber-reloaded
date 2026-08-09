import cors from "@elysiajs/cors";
import { Elysia, ValidationError } from "elysia";
import AppController from "../../src/controller/app/app.controller";
import BeatLeaderController from "../../src/controller/beatleader/beatleader.controller";
import BeatSaverController from "../../src/controller/beatsaver/beatsaver.controller";
import LeaderboardController from "../../src/controller/leaderboard/leaderboard.controller";
import MetricsController from "../../src/controller/metrics/metrics.controller";
import PlayerRankingController from "../../src/controller/player/player-ranking.controller";
import PlayerController from "../../src/controller/player/player.controller";
import PlaylistController from "../../src/controller/playlist/playlist.controller";
import ScoresController from "../../src/controller/scores/scores.controller";
import { WebsocketManager } from "../../src/websocket/websocket-manager";
import { patchScoreSaberApiForTests } from "./scoresaber-api-test-patches";

let websocketsRegistered = false;

function registerWebsocketRoutes(app: Elysia): void {
  if (!websocketsRegistered) {
    new WebsocketManager();
    websocketsRegistered = true;
  }

  for (const websocket of WebsocketManager.getAll()) {
    app.ws(websocket.route, {
      open: ws => websocket.onOpen(ws.raw),
      close: ws => websocket.onClose(ws.raw),
    });
  }
}

/**
 * Builds an Elysia app with the same HTTP routes as production, without crons,
 * websockets, or the production listen lifecycle.
 */
export function createTestApp() {
  patchScoreSaberApiForTests();

  const app = new Elysia()
    .onError({ as: "global" }, ({ code, error }) => {
      if (code === "VALIDATION") {
        return JSON.parse(JSON.stringify((error as ValidationError).all));
      }

      let status: number | undefined;
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
    .use(cors())
    .use(AppController)
    .use(PlayerController)
    .use(ScoresController)
    .use(LeaderboardController)
    .use(PlaylistController)
    .use(BeatSaverController)
    .use(BeatLeaderController)
    .use(PlayerRankingController)
    .use(MetricsController);

  registerWebsocketRoutes(app);

  return app;
}
