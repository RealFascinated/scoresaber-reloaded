import * as dotenv from "@dotenvx/dotenvx";
import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { PlayerModel } from "@ssr/common/model/player";
import {
  PlayerHistoryEntry,
  PlayerHistoryEntryModel,
} from "@ssr/common/model/player/player-history-entry";
import mongoose from "mongoose";

dotenv.config({
  path: ".env",
  override: true,
});

// Connect to Mongo
await mongoose.connect(env.MONGO_CONNECTION_STRING);

export interface PlayerHistoryData {
  /**
   * The player's rank.
   */
  rank?: number;

  /**
   * The player's country rank.
   */
  countryRank?: number;

  /**
   * The pp of the player.
   */
  pp?: number;

  /**
   * The amount of pp required to gain 1 global pp.
   */
  plusOnePp?: number;

  /**
   * How many times replays of the player scores have been watched
   */
  replaysWatched?: number;

  /**
   * The player's score stats.
   */
  score?: {
    /**
     * The total amount of unranked and ranked score.
     */
    totalScore?: number;

    /**
     * The total amount of ranked score.
     */
    totalRankedScore?: number;
  };

  /**
   * The player's scores stats.
   */
  scores?: {
    /**
     * The amount of score set.
     */
    rankedScores?: number;

    /**
     * The amount of unranked scores set.
     */
    unrankedScores?: number;

    /**
     * The total amount of ranked scores
     */
    totalRankedScores?: number;

    /**
     * The total amount of scores
     */
    totalScores?: number;
  };

  /**
   * The player's accuracy stats.
   */
  accuracy?: {
    /**
     * The player's average ranked accuracy.
     */
    averageRankedAccuracy?: number;

    /**
     * The player's average unranked accuracy.
     */
    averageUnrankedAccuracy?: number;

    /**
     * The player's average accuracy.
     */
    averageAccuracy?: number;
  };
}

interface PlayerDocument {
  _id: string;
  statisticHistory?: Record<string, PlayerHistoryData>;
}

async function migratePlayerHistory() {
  Logger.info("Starting player history migration...");

  const players = (await PlayerModel.find({}).lean()) as PlayerDocument[];
  const totalPlayers = players.length;
  Logger.info(`Found ${totalPlayers} players to process`);

  let migrated = 0;
  let skipped = 0;
  const BATCH_SIZE = 50;
  const batches = Math.ceil(totalPlayers / BATCH_SIZE);

  for (let i = 0; i < batches; i++) {
    const start = i * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, totalPlayers);
    const batch = players.slice(start, end);

    await Promise.all(
      batch.map(async player => {
        if (!player.statisticHistory || Object.keys(player.statisticHistory).length === 0) {
          skipped++;
          return;
        }

        const updates = Object.entries(player.statisticHistory).map(([date, history]) => {
          const updateData: Partial<PlayerHistoryEntry> = {
            playerId: player._id,
          };

          // Helper to check if a value is valid
          const isValidNumber = (val: unknown): boolean =>
            typeof val === "number" && !isNaN(val) && isFinite(val);

          // Add fields only if they have valid values
          if (isValidNumber(history.rank)) updateData.rank = history.rank;
          if (isValidNumber(history.countryRank)) updateData.countryRank = history.countryRank;
          if (isValidNumber(history.pp)) updateData.pp = history.pp;
          if (isValidNumber(history.plusOnePp)) updateData.plusOnePp = history.plusOnePp;
          if (isValidNumber(history.replaysWatched))
            updateData.replaysWatched = history.replaysWatched;

          if (history.score) {
            if (isValidNumber(history.score.totalScore))
              updateData.totalScore = history.score.totalScore;
            if (isValidNumber(history.score.totalRankedScore))
              updateData.totalRankedScore = history.score.totalRankedScore;
          }

          if (history.scores) {
            if (isValidNumber(history.scores.rankedScores))
              updateData.rankedScores = history.scores.rankedScores;
            if (isValidNumber(history.scores.unrankedScores))
              updateData.unrankedScores = history.scores.unrankedScores;
            if (isValidNumber(history.scores.totalRankedScores))
              updateData.totalRankedScores = history.scores.totalRankedScores;
            if (isValidNumber(history.scores.totalScores))
              updateData.totalScores = history.scores.totalScores;
          }

          if (history.accuracy) {
            if (isValidNumber(history.accuracy.averageRankedAccuracy))
              updateData.averageRankedAccuracy = history.accuracy.averageRankedAccuracy;
            if (isValidNumber(history.accuracy.averageUnrankedAccuracy))
              updateData.averageUnrankedAccuracy = history.accuracy.averageUnrankedAccuracy;
            if (isValidNumber(history.accuracy.averageAccuracy))
              updateData.averageAccuracy = history.accuracy.averageAccuracy;
          }

          return PlayerHistoryEntryModel.findOneAndUpdate(
            { playerId: player._id, date: new Date(date) },
            updateData,
            { upsert: true }
          );
        });

        await Promise.all(updates);
        migrated++;
      })
    );

    Logger.info(
      `Progress: ${end}/${totalPlayers} players (${Math.round((end / totalPlayers) * 100)}%)`
    );
  }

  Logger.info(`Migration complete. Migrated: ${migrated}, Skipped: ${skipped}`);

  process.exit(0);
}

migratePlayerHistory().catch(error => {
  Logger.error("Migration failed:", error);
  process.exit(1);
});
