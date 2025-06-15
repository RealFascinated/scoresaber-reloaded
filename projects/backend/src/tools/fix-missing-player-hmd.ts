import * as dotenv from "@dotenvx/dotenvx";
import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { PlayerModel } from "@ssr/common/model/player";
import mongoose from "mongoose";
import { PlayerService } from "../service/player/player.service";

dotenv.config({
  path: ".env",
  override: true,
});

// Connect to Mongo
await mongoose.connect(env.MONGO_CONNECTION_STRING); // Connect to MongoDB

async function migrate() {
  Logger.info("Starting migration...");
  const players = await PlayerModel.find({ hmd: { $exists: false } });

  let current = 0;
  for (const player of players) {
    current++;
    if (current % 100 === 0) {
      Logger.info(`Processed ${current}/${players.length} players...`);
    }

    const hmd = await PlayerService.getPlayerMostCommonRecentHmd(player.id);
    if (hmd) {
      await PlayerService.updatePlayerHmd(player.id, hmd);
    }
  }

  Logger.info("Migration complete!");
}

await migrate();
process.exit(0);
