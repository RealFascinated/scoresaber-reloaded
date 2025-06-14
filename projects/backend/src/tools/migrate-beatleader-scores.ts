import * as dotenv from "@dotenvx/dotenvx";
import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { AdditionalScoreDataModel } from "@ssr/common/model/additional-score-data/additional-score-data";
import { MapDifficulty } from "@ssr/common/score/map-difficulty";
import { MapCharacteristic } from "@ssr/common/types/map-characteristic";
import mongoose from "mongoose";

dotenv.config({
  path: ".env",
  override: true,
});

// Connect to Mongo
await mongoose.connect(env.MONGO_CONNECTION_STRING); // Connect to MongoDB

async function migrate() {
  Logger.info("Starting migration...");

  // First, remove all cachedReplayId fields
  const result = await AdditionalScoreDataModel.updateMany(
    { cachedReplayId: { $exists: true, $ne: null } },
    [
      {
        $set: {
          savedReplay: true,
          cachedReplayId: "$$REMOVE",
        },
      },
    ]
  );
  Logger.info(`Removed cachedReplayId from ${result.modifiedCount} documents`);

  const BATCH_SIZE = 1000;
  let processedCount = 0;
  let batchCount = 0;

  const cursor = AdditionalScoreDataModel.find({}).cursor();

  for await (const score of cursor) {
    const difficulty = score.songDifficulty;
    if (difficulty.includes("-")) {
      const [difficultyName, modeName] = difficulty.split("-");

      await AdditionalScoreDataModel.updateOne(
        { _id: score._id },
        {
          $set: {
            songDifficulty: difficultyName as MapDifficulty,
            songCharacteristic: modeName as MapCharacteristic,
          },
        }
      );
    }
    processedCount++;

    if (processedCount % BATCH_SIZE === 0) {
      batchCount++;
      Logger.info(`Processed ${processedCount} scores (Batch ${batchCount})`);
    }
  }

  Logger.info(`Migration complete! Processed ${processedCount} scores in total.`);
}

await migrate();
process.exit(0);
