import * as dotenv from "@dotenvx/dotenvx";
import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import mongoose from "mongoose";

dotenv.config({
  path: ".env",
  override: true,
});

// Connect to Mongo
await mongoose.connect(env.MONGO_CONNECTION_STRING);

async function removeCompoundIndex() {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not established");
    }
    const collection = db.collection("scoresaber-scores");

    // List all indexes to find the compound index
    const indexes = await collection.indexes();
    Logger.info(
      "Current indexes:",
      indexes.map(idx => idx.key)
    );

    // Find and remove the compound index
    const compoundIndexName = indexes.find(
      idx => Object.keys(idx.key).length === 2 && idx.key.timestamp === 1 && idx.key.pp === -1
    )?.name;

    if (compoundIndexName) {
      Logger.info(`Removing compound index: ${compoundIndexName}`);
      await collection.dropIndex(compoundIndexName);
      Logger.info("Compound index removed successfully");
    } else {
      Logger.info("No compound index found to remove");
    }

    // List indexes after removal
    const remainingIndexes = await collection.indexes();
    Logger.info(
      "Remaining indexes:",
      remainingIndexes.map(idx => idx.key)
    );
  } catch (error) {
    Logger.error("Error removing compound index:", error);
  }
}

await removeCompoundIndex();
process.exit(0);
