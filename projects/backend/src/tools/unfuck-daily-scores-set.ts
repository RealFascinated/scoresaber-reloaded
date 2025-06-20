import * as dotenv from "@dotenvx/dotenvx";
import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { PlayerHistoryEntryModel } from "@ssr/common/model/player/player-history-entry";
import { getDaysAgoDate } from "@ssr/common/utils/time-utils";
import mongoose from "mongoose";

dotenv.config({
  path: ".env",
  override: true,
});

// Connect to Mongo
await mongoose.connect(env.MONGO_CONNECTION_STRING); // Connect to MongoDB

async function migrate() {
  Logger.info("Fixing daily score stats...");

  // Reset daily score stats for the last 2 days
  await PlayerHistoryEntryModel.updateMany(
    {
      date: { $gt: getDaysAgoDate(2) },
    },
    {
      $set: {
        rankedScores: 0,
        unrankedScores: 0,
        rankedScoresImproved: 0,
        unrankedScoresImproved: 0,
      },
    }
  );
}

await migrate();
process.exit(0);
