import * as dotenv from "@dotenvx/dotenvx";
import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { ScoreSaberPreviousScoreModel } from "@ssr/common/model/score/impl/scoresaber-previous-score";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { Modifier } from "@ssr/common/score/modifier";
import mongoose from "mongoose";

dotenv.config({
  path: ".env",
  override: true,
});

// Connect to Mongo
await mongoose.connect(env.MONGO_CONNECTION_STRING); // Connect to MongoDB

const BATCH_SIZE = 25_000;

async function migrateCurrentScores() {
  Logger.info("Starting migration for current scores...");

  // Get total count for progress tracking
  const totalCount = await ScoreSaberScoreModel.countDocuments({
    modifiedScore: { $exists: false },
  });

  Logger.info(`Found ${totalCount} current scores to process`);

  let processedCount = 0;
  let updatedCount = 0;
  let skip = 0;

  while (true) {
    const scores = await ScoreSaberScoreModel.find({
      modifiedScore: { $exists: false },
    })
      .skip(skip)
      .limit(BATCH_SIZE)
      .lean();

    if (scores.length === 0) {
      break;
    }

    Logger.info(
      `Processing current scores batch ${Math.floor(skip / BATCH_SIZE) + 1}: ${scores.length} scores`
    );

    // Process scores in parallel for better performance
    const updatePromises = scores
      .filter(score => score.modifiers.includes(Modifier.NF))
      .map(score =>
        ScoreSaberScoreModel.updateOne(
          { _id: score._id },
          { $set: { modifiedScore: score.score / 0.5 } }
        )
      );

    if (updatePromises.length > 0) {
      const results = await Promise.all(updatePromises);
      const batchUpdatedCount = results.reduce((sum, result) => sum + result.modifiedCount, 0);
      updatedCount += batchUpdatedCount;
      Logger.info(`Updated ${batchUpdatedCount} current scores in this batch`);
    }

    processedCount += scores.length;
    skip += BATCH_SIZE;

    // Log progress
    const progress = ((processedCount / totalCount) * 100).toFixed(2);
    Logger.info(`Current scores progress: ${processedCount}/${totalCount} (${progress}%)`);
  }

  Logger.info(
    `Current scores migration complete! Processed ${processedCount} scores, updated ${updatedCount} scores`
  );
}

async function migratePreviousScores() {
  Logger.info("Starting migration for previous scores...");

  // Get total count for progress tracking
  const totalCount = await ScoreSaberPreviousScoreModel.countDocuments({
    modifiedScore: { $exists: false },
  });

  Logger.info(`Found ${totalCount} previous scores to process`);

  let processedCount = 0;
  let updatedCount = 0;
  let skip = 0;

  while (true) {
    const scores = await ScoreSaberPreviousScoreModel.find({
      modifiedScore: { $exists: false },
    })
      .skip(skip)
      .limit(BATCH_SIZE)
      .lean();

    if (scores.length === 0) {
      break;
    }

    Logger.info(
      `Processing previous scores batch ${Math.floor(skip / BATCH_SIZE) + 1}: ${scores.length} scores`
    );

    // Process scores in parallel for better performance
    const updatePromises = scores
      .filter(score => score.modifiers.includes(Modifier.NF))
      .map(score =>
        ScoreSaberPreviousScoreModel.updateOne(
          { _id: score._id },
          { $set: { modifiedScore: score.score / 0.5 } }
        )
      );

    if (updatePromises.length > 0) {
      const results = await Promise.all(updatePromises);
      const batchUpdatedCount = results.reduce((sum, result) => sum + result.modifiedCount, 0);
      updatedCount += batchUpdatedCount;
      Logger.info(`Updated ${batchUpdatedCount} previous scores in this batch`);
    }

    processedCount += scores.length;
    skip += BATCH_SIZE;

    // Log progress
    const progress = ((processedCount / totalCount) * 100).toFixed(2);
    Logger.info(`Previous scores progress: ${processedCount}/${totalCount} (${progress}%)`);
  }

  Logger.info(
    `Previous scores migration complete! Processed ${processedCount} scores, updated ${updatedCount} scores`
  );
}

async function migrate() {
  Logger.info("Starting migration for both current and previous scores...");

  await migratePreviousScores();
  await migrateCurrentScores();

  Logger.info("Migration completed for both current and previous scores!");
}

try {
  await migrate();
  Logger.info("Migration completed successfully");
} catch (error) {
  Logger.error("Migration failed:", error);
  process.exit(1);
} finally {
  await mongoose.disconnect();
  process.exit(0);
}
