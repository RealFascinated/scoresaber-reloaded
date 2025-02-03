import * as dotenv from "@dotenvx/dotenvx";
import { Config } from "@ssr/common/config";
import Logger from "@ssr/common/logger";
import {
  AdditionalScoreDataDocument,
  AdditionalScoreDataModel,
} from "@ssr/common/model/additional-score-data/additional-score-data";
import { PlayerModel } from "@ssr/common/model/player";
import { ScoreStatsDocument, ScoreStatsModel } from "@ssr/common/model/score-stats/score-stats";
import mongoose from "mongoose";

dotenv.config({
  path: ".env",
  override: true,
});

// Connect to Mongo
await mongoose.connect(Config.mongoUri!); // Connect to MongoDB

const playerCache = new Map<string, boolean>();

export async function cleanupAdditionalScoreData() {
  const limit = 2500;
  let removed = 0;
  let processed = 0;
  let lastId: number | null = null;
  let hasMore = true;

  while (hasMore) {
    const query = lastId
      ? {
          scoreId: { $gt: lastId },
          playerId: { $exists: true },
          leaderboardId: { $exists: true },
        }
      : {
          playerId: { $exists: true },
          leaderboardId: { $exists: true },
        };

    const additionalScoreData: AdditionalScoreDataDocument[] = await AdditionalScoreDataModel.find(query)
      .limit(limit)
      .sort({ scoreId: 1 });

    if (additionalScoreData.length === 0) {
      hasMore = false;
      break;
    }

    for (const data of additionalScoreData) {
      const player = playerCache.get(data.playerId);
      if (player === undefined) {
        const exists = await PlayerModel.exists({ _id: data.playerId });
        playerCache.set(data.playerId, exists !== null);
      }

      if (!playerCache.get(data.playerId)) {
        await AdditionalScoreDataModel.deleteOne({ scoreId: data.scoreId });
        removed++;
      }

      processed++;
      lastId = data.scoreId;
    }

    const remaining = await AdditionalScoreDataModel.countDocuments({
      playerId: { $exists: true },
      leaderboardId: { $exists: true },
    });
    Logger.info(`Processed ${processed} records (${removed} removed). Remaining: ${remaining}`);
  }

  Logger.info(`Cleanup complete. Total processed: ${processed}, Total removed: ${removed}`);
}

export async function cleanupScoreStats() {
  const limit = 1000;
  let removed = 0;
  let processed = 0;
  let lastId: number | null = null;
  let hasMore = true;

  while (hasMore) {
    // Get next batch of unprocessed records
    const query = lastId ? { _id: { $gt: lastId } } : {};
    const scoreStats: ScoreStatsDocument[] = await ScoreStatsModel.find(query).limit(limit).sort({ _id: 1 });

    if (scoreStats.length === 0) {
      hasMore = false;
      break;
    }

    for (const data of scoreStats) {
      const additionalScoreDataExists = await AdditionalScoreDataModel.exists({
        scoreId: data._id,
      });

      if (!additionalScoreDataExists) {
        await ScoreStatsModel.deleteOne({ _id: data._id });
        removed++;
      }
      processed++;
      lastId = data._id;
    }

    const remaining = await ScoreStatsModel.countDocuments();
    Logger.info(`Processed ${processed} records (${removed} removed). Remaining: ${remaining}`);
  }

  Logger.info(`Cleanup complete. Total processed: ${processed}, Total removed: ${removed}`);
}

// Only run cleanup if this file is being executed directly
if (require.main === module) {
  (async () => {
    try {
      await mongoose.connect(Config.mongoUri!);
      Logger.info("Starting cleanup process...");

      await cleanupAdditionalScoreData();
      Logger.info("Completed additional score data cleanup");

      await cleanupScoreStats();
      Logger.info("Completed score stats cleanup");

      await mongoose.disconnect();
      Logger.info("Cleanup process complete");
    } catch (error) {
      Logger.error("Error during cleanup:", error);
    } finally {
      process.exit(0);
    }
  })().catch(error => {
    Logger.error("Fatal error:", error);
    process.exit(1);
  });
}
