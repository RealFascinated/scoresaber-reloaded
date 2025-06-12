import * as dotenv from "@dotenvx/dotenvx";
import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { PlayerModel } from "@ssr/common/model/player";
import mongoose from "mongoose";

dotenv.config({
  path: ".env",
  override: true,
});

// Connect to Mongo
await mongoose.connect(env.MONGO_CONNECTION_STRING); // Connect to MongoDB

async function migrate() {
  Logger.info("Starting migration...");
  const players = await PlayerModel.find({ joinedDate: { $exists: false } });

  let current = 0;
  for (const player of players) {
    current++;
    if (current % 100 === 0) {
      Logger.info(`Processed ${current}/${players.length} players...`);
    }

    try {
      const token = await ApiServiceRegistry.getInstance()
        .getScoreSaberService()
        .lookupPlayer(player._id);

      if (token) {
        player.joinedDate = new Date(token.firstSeen);
        player.markModified("joinedDate");
        await player.save();
      }
    } catch (error) {
      Logger.error(`Failed to fetch player ${player._id} from API:`, error);
    }
  }

  Logger.info("Migration complete!");
}

await migrate();
process.exit(0);
