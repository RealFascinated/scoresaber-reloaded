import mongoose from "mongoose";
import { Config } from "@ssr/common/config";
import * as dotenv from "@dotenvx/dotenvx";
import { ScoreSaberPreviousScoreModel } from "@ssr/common/model/score/impl/scoresaber-previous-score";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";

dotenv.config({
  path: ".env",
  override: true,
});

// Connect to Mongo
await mongoose.connect(Config.mongoUri!); // Connect to MongoDB

async function migrate() {
  // Adjusted aggregation pipeline
  const scoreGroups = await ScoreSaberScoreModel.aggregate([
    {
      $group: {
        _id: { playerId: "$playerId", leaderboardId: "$leaderboardId" },
        scores: {
          $push: {
            scoreId: "$scoreId",
            timestamp: "$timestamp",
            fullDocument: "$$ROOT",
          },
        },
      },
    },
    // Sort scores within each group by timestamp
    {
      $project: {
        _id: 1,
        scores: {
          $sortArray: {
            input: "$scores",
            sortBy: { timestamp: -1 },
          },
        },
      },
    },
  ]);

  if (scoreGroups.length === 0) {
    console.log("No scores to migrate");
    return;
  }

  let totalMigrated = 0;

  for (const group of scoreGroups) {
    const { playerId, leaderboardId } = group._id;
    const sortedScores = group.scores;

    // Skip if only one score exists
    if (sortedScores.length <= 1) continue;

    // First score is the latest, rest are previous scores
    for (let i = 1; i < sortedScores.length; i++) {
      const { fullDocument } = sortedScores[i];
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, ...rest } = fullDocument;

      try {
        await ScoreSaberPreviousScoreModel.create(rest);
        await ScoreSaberScoreModel.deleteOne({ _id: _id });

        console.log(`Migrated previous score ${_id} for ${playerId} on leaderboard ${leaderboardId}`);
        totalMigrated++;
      } catch (error) {
        console.error(`Error migrating score ${_id}:`, error);
      }
    }
  }

  console.log(`Finished migrating ${totalMigrated} scores`);
}

await migrate();
process.exit(0);
