import { Elysia } from "elysia";
import cors from "@elysiajs/cors";
import { decorators } from "elysia-decorators";
import { logger } from "@tqman/nice-logger";
import { swagger } from "@elysiajs/swagger";
import { rateLimit } from "elysia-rate-limit";
import { RateLimitError } from "./error/rate-limit-error";
import { helmet } from "elysia-helmet";
import { etag } from "@bogeychan/elysia-etag";
import AppController from "./controller/app.controller";
import * as dotenv from "@dotenvx/dotenvx";
import mongoose from "mongoose";
import { Config } from "./common/config";
import { setLogLevel } from "@typegoose/typegoose";
import PlayerController from "./controller/player.controller";
import { PlayerService } from "./service/player.service";
import { cron } from "@elysiajs/cron";
import { PlayerDocument, PlayerModel } from "./model/player";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { delay } from "@ssr/common/utils/utils";

// Load .env file
dotenv.config({
  logLevel: "success",
  path: ".env",
  override: true,
});

await mongoose.connect(Config.mongoUri!); // Connect to MongoDB
setLogLevel("DEBUG");
export const app = new Elysia();

app.use(
  cron({
    name: "player-statistics-tracker-cron",
    pattern: "1 0 * * *", // Every day at 00:01 (London time)
    timezone: "Europe/London",
    run: async () => {
      const pages = 20; // top 1000 players
      const cooldown = 60_000 / 250; // 250 requests per minute

      let toTrack: PlayerDocument[] = await PlayerModel.find({});
      const toRemoveIds: string[] = [];

      // loop through pages to fetch the top players
      console.log(`Fetching ${pages} pages of players from ScoreSaber...`);
      for (let i = 0; i < pages; i++) {
        const pageNumber = i + 1;
        console.log(`Fetching page ${pageNumber}...`);
        const page = await scoresaberService.lookupPlayers(pageNumber);
        if (page === undefined) {
          console.log(`Failed to fetch players on page ${pageNumber}, skipping page...`);
          await delay(cooldown);
          continue;
        }
        for (const player of page.players) {
          const foundPlayer = await PlayerService.getPlayer(player.id, true, player);
          await PlayerService.trackScoreSaberPlayer(foundPlayer, player);
          toRemoveIds.push(foundPlayer.id);
        }
        await delay(cooldown);
      }
      console.log(`Finished tracking player statistics for ${pages} pages, found ${toRemoveIds.length} players.`);

      // remove all players that have been tracked
      toTrack = toTrack.filter(player => !toRemoveIds.includes(player.id));

      console.log(`Tracking ${toTrack.length} player statistics...`);
      for (const player of toTrack) {
        await PlayerService.trackScoreSaberPlayer(player);
        await delay(cooldown);
      }
      console.log("Finished tracking player statistics.");
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

  let status = "status" in error ? error.status : undefined;
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
    mode: "combined",
  })
);

/**
 * Rate limit (100 requests per minute)
 */
app.use(
  rateLimit({
    scoping: "global",
    duration: 60 * 1000,
    max: 100,
    skip: request => {
      let [_, path] = request.url.split("/"); // Get the url parts
      path === "" || (path === undefined && (path = "/")); // If we're on /, the path is undefined, so we set it to /
      return path === "/"; // ignore all requests to /
    },
    errorResponse: new RateLimitError("Too many requests, please try again later"),
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
    controllers: [AppController, PlayerController],
  })
);

/**
 * Swagger Documentation
 */
app.use(swagger());

app.onStart(() => {
  console.log("Listening on port http://localhost:8080");
});

app.listen(8080);
