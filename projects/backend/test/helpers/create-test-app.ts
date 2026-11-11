import cors from "@elysiajs/cors";
import { AnyElysia, Elysia, ValidationError } from "elysia";
import { websocket as websocketPlugin } from "elysia/websocket";
import { getHttpErrorCode } from "../../src/common/error-code";
import AppController from "../../src/controller/app/app.controller";
import AuthController from "../../src/controller/auth/auth.controller";
import BeatLeaderController from "../../src/controller/beatleader/beatleader.controller";
import BeatSaverController from "../../src/controller/beatsaver/beatsaver.controller";
import LeaderboardController from "../../src/controller/leaderboard/leaderboard.controller";
import MetricsController from "../../src/controller/metrics/metrics.controller";
import PlayerRankingController from "../../src/controller/player/player-ranking.controller";
import PlayerController from "../../src/controller/player/player.controller";
import PlaylistController from "../../src/controller/playlist/playlist.controller";
import ScoresController from "../../src/controller/scores/scores.controller";
import UserFollowingController from "../../src/controller/user/user-following.controller";
import UserPinnedScoresController from "../../src/controller/user/user-pinned-scores.controller";
import UserPreferencesController from "../../src/controller/user/user-preferences.controller";
import UserController from "../../src/controller/user/user.controller";
import { authCors } from "../../src/plugins/auth-cors";
import { privateNetworkCors } from "../../src/plugins/private-network-cors";
import { WebsocketManager } from "../../src/websocket/websocket-manager";
import { patchScoreSaberApiForTests } from "./scoresaber-api-test-patches";

type TestWebsocketClient = { id: string; send(data: string): unknown };

let websocketsRegistered = false;

function registerWebsocketRoutes(app: AnyElysia): void {
  if (!websocketsRegistered) {
    new WebsocketManager();
    websocketsRegistered = true;
  }

  app.use(websocketPlugin());

  for (const websocket of WebsocketManager.getAll()) {
    app.ws(websocket.route, {
      open: (ws: TestWebsocketClient) => websocket.onOpen(ws),
      close: (ws: TestWebsocketClient) => websocket.onClose(ws),
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
    .onError("global", ({ error }) => {
      const code = getHttpErrorCode(error);
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
    .use(authCors)
    .use(privateNetworkCors)
    .use(cors())
    .use(AppController)
    .use(AuthController)
    .use(UserPreferencesController)
    .use(UserController)
    .use(UserFollowingController)
    .use(UserPinnedScoresController)
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
