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
import { ScoreService } from "./service/score.service";
import { Config } from "@ssr/common/config";
import ScoresController from "./controller/scores.controller";
import LeaderboardController from "./controller/leaderboard.controller";
import { getAppVersion } from "./common/app.util";
import { connectScoresaberWebsocket } from "@ssr/common/websocket/scoresaber-websocket";
import { connectBeatLeaderWebsocket } from "@ssr/common/websocket/beatleader-websocket";
import { DiscordChannels, initDiscordBot, logToChannel } from "./bot/bot";
import { EmbedBuilder } from "discord.js";

// Load .env file
dotenv.config({
  logLevel: (await Bun.file(".env").exists()) ? "success" : "warn",
  path: ".env",
  override: true,
});

// Connect to Mongo
await mongoose.connect(Config.mongoUri!); // Connect to MongoDB

// Connect to websockets
connectScoresaberWebsocket({
  onScore: async score => {
    await ScoreService.trackScoreSaberScore(score.score, score.leaderboard);
    await ScoreService.updatePlayerScoresSet(score);

    await ScoreService.notifyNumberOne(score);
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
    await ScoreService.trackBeatLeaderScore(score);
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
    pattern: "1 0 * * *", // Every day at 00:01
    timezone: "Europe/London", // UTC time
    run: async () => {
      await PlayerService.updatePlayerStatistics();
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
      await PlayerService.refreshPlayerScores();
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
    controllers: [AppController, PlayerController, ImageController, ScoresController, LeaderboardController],
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
});

app.listen(8080);
