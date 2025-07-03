import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import Logger from "@ssr/common/logger";
import {
  ScoreSaberLeaderboard,
  ScoreSaberLeaderboardModel,
} from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import LeaderboardDifficulty from "@ssr/common/model/leaderboard/leaderboard-difficulty";
import { ScoreSaberPreviousScoreModel } from "@ssr/common/model/score/impl/scoresaber-previous-score";
import {
  ScoreSaberScoreDocument,
  ScoreSaberScoreModel,
} from "@ssr/common/model/score/impl/scoresaber-score";
import { LeaderboardUpdate, LeaderboardUpdates } from "../../common/types/leaderboard";
import { LeaderboardService } from "./leaderboard.service";

const BATCH_SIZE = 100;

export class LeaderboardRankingService {
  /**
   * Unranks a single leaderboard and updates its scores
   */
  public static async unrankLeaderboard(leaderboard: ScoreSaberLeaderboard): Promise<void> {
    // Use bulk operations to reset PP and weight for all scores in this leaderboard
    await ScoreSaberScoreModel.updateMany(
      { leaderboardId: leaderboard.id },
      { $set: { pp: 0, weight: 0 } }
    );

    // Also reset PP and weight for previous scores
    await ScoreSaberPreviousScoreModel.updateMany(
      { leaderboardId: leaderboard.id },
      { $set: { pp: 0, weight: 0 } }
    );

    // Update the leaderboard
    await ScoreSaberLeaderboardModel.findOneAndUpdate(
      { _id: leaderboard.id },
      {
        lastRefreshed: new Date(),
        ...leaderboard,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );
    Logger.info(`Previously ranked leaderboard "${leaderboard.id}" has been unranked.`);
  }

  /**
   * Unranks leaderboards that are no longer in the ranked list
   */
  public static async unrankOldLeaderboards(
    currentLeaderboards: ScoreSaberLeaderboard[]
  ): Promise<ScoreSaberLeaderboard[]> {
    const unrankedLeaderboards: ScoreSaberLeaderboard[] = [];

    const rankedIds = currentLeaderboards.map(leaderboard => leaderboard.id);
    const rankedLeaderboards = await ScoreSaberLeaderboardModel.find({
      ranked: true,
      _id: { $nin: rankedIds },
    });

    if (rankedLeaderboards.length === 0) {
      return unrankedLeaderboards;
    }

    // Batch API calls to check which leaderboards are still ranked
    const apiCheckPromises = rankedLeaderboards.map(async previousLeaderboard => {
      try {
        const leaderboard = await ApiServiceRegistry.getInstance()
          .getScoreSaberService()
          .lookupLeaderboard(previousLeaderboard.id + "");
        return { previousLeaderboard, isStillRanked: leaderboard?.ranked || false };
      } catch (error) {
        Logger.warn(`Failed to check leaderboard ${previousLeaderboard.id}:`, error);
        return { previousLeaderboard, isStillRanked: true }; // Assume still ranked on error
      }
    });

    const apiResults = await Promise.all(apiCheckPromises);
    const leaderboardsToUnrank = apiResults
      .filter(result => !result.isStillRanked)
      .map(result => result.previousLeaderboard);

    if (leaderboardsToUnrank.length === 0) {
      return unrankedLeaderboards;
    }

    // Prepare bulk operations for scores
    const scoreBulkOps = [];
    const previousScoreBulkOps = [];
    const leaderboardBulkOps = [];

    for (const leaderboard of leaderboardsToUnrank) {
      // Reset PP and weight for scores
      scoreBulkOps.push({
        updateMany: {
          filter: { leaderboardId: leaderboard.id },
          update: { $set: { pp: 0, weight: 0 } },
        },
      });

      // Reset PP and weight for previous scores
      previousScoreBulkOps.push({
        updateMany: {
          filter: { leaderboardId: leaderboard.id },
          update: { $set: { pp: 0, weight: 0 } },
        },
      });

      // Update leaderboard
      leaderboardBulkOps.push({
        updateOne: {
          filter: { _id: leaderboard.id },
          update: {
            $set: {
              lastRefreshed: new Date(),
              ranked: false,
              qualified: false,
            },
          },
        },
      });

      unrankedLeaderboards.push(leaderboard);
    }

    // Execute bulk operations
    if (scoreBulkOps.length > 0) {
      await ScoreSaberScoreModel.bulkWrite(scoreBulkOps);
    }
    if (previousScoreBulkOps.length > 0) {
      await ScoreSaberPreviousScoreModel.bulkWrite(previousScoreBulkOps);
    }
    if (leaderboardBulkOps.length > 0) {
      await ScoreSaberLeaderboardModel.bulkWrite(leaderboardBulkOps);
    }

    Logger.info(`Unranked ${leaderboardsToUnrank.length} previously ranked leaderboards.`);
    return unrankedLeaderboards;
  }

  /**
   * Handles updates for a single leaderboard when its status changes
   */
  public static async handleLeaderboardUpdate(update: LeaderboardUpdate): Promise<number> {
    const scores: ScoreSaberScoreDocument[] = (await ScoreSaberScoreModel.find({
      leaderboardId: update.leaderboard.id,
    }).sort({ timestamp: -1 })) as unknown as ScoreSaberScoreDocument[];

    if (!scores) {
      Logger.warn(`Failed to fetch local scores for leaderboard "${update.leaderboard.id}".`);
      return 0;
    }

    // Log changes
    if (update.rankedStatusChanged) {
      Logger.info(
        `Leaderboard "${update.leaderboard.id}" ranked status changed from ${update.previousLeaderboard?.ranked} to ${update.leaderboard.ranked}.`
      );
    }
    if (update.starCountChanged) {
      Logger.info(
        `Leaderboard "${update.leaderboard.id}" star count changed from ${update.previousLeaderboard?.stars} to ${update.leaderboard.stars}.`
      );
    }

    if (update.rankedStatusChanged && !update.leaderboard.ranked) {
      // Bulk update to reset PP values for all scores in this leaderboard
      const result = await ScoreSaberScoreModel.updateMany(
        { leaderboardId: update.leaderboard.id },
        { $set: { pp: 0, weight: 0 } }
      );

      // Also reset PP values for previous scores
      await ScoreSaberPreviousScoreModel.updateMany(
        { leaderboardId: update.leaderboard.id },
        { $set: { pp: 0, weight: 0 } }
      );

      return result.modifiedCount || 0;
    }

    if (
      (update.starCountChanged && update.leaderboard.ranked) ||
      (update.rankedStatusChanged && update.leaderboard.ranked) ||
      (update.qualifiedStatusChanged && update.leaderboard.qualified)
    ) {
      const scoreMap = new Map(scores.map(score => [`${score.scoreId}-${score.score}`, score]));

      let currentPage = 1;
      let totalPages = 1; // will be updated after first fetch
      let updatedCount = 0;

      while (currentPage <= totalPages) {
        const response = await ApiServiceRegistry.getInstance()
          .getScoreSaberService()
          .lookupLeaderboardScores(update.leaderboard.id + "", currentPage);

        if (!response) {
          Logger.warn(
            `Failed to fetch scores for leaderboard "${update.leaderboard.id}" on page ${currentPage}. Skipping page.`
          );
          currentPage++;
          continue;
        }

        totalPages = Math.ceil(response.metadata.total / response.metadata.itemsPerPage);

        // Prepare bulk operations for this page only
        const scoreBulkOpsPage = [];
        const previousScoreBulkOpsPage = [];

        for (const scoreToken of response.scores) {
          const score = scoreMap.get(`${scoreToken.id}-${scoreToken.baseScore}`);
          if (!score) continue;

          // Update score
          scoreBulkOpsPage.push({
            updateOne: {
              filter: { _id: score.id },
              update: {
                $set: {
                  pp: scoreToken.pp,
                  weight: scoreToken.weight,
                  rank: scoreToken.rank,
                },
              },
            },
          });

          // Update previous scores
          previousScoreBulkOpsPage.push({
            updateMany: {
              filter: {
                playerId: score.playerId,
                leaderboardId: score.leaderboardId,
              },
              update: {
                $set: {
                  pp: update.leaderboard.ranked
                    ? ScoreSaberCurve.getPp(update.leaderboard.stars, score.accuracy)
                    : 0,
                  weight: 0,
                },
              },
            },
          });
        }

        // Execute bulk operations for this page
        if (scoreBulkOpsPage.length > 0) {
          const pageResult = await ScoreSaberScoreModel.bulkWrite(scoreBulkOpsPage);
          updatedCount += pageResult.modifiedCount || 0;
        }
        if (previousScoreBulkOpsPage.length > 0) {
          await ScoreSaberPreviousScoreModel.bulkWrite(previousScoreBulkOpsPage);
        }

        scoreBulkOpsPage.length = 0;
        previousScoreBulkOpsPage.length = 0;
        currentPage++;
      }

      scoreMap.clear();
      return updatedCount;
    }

    return 0;
  }

  /**
   * Processes updates for all leaderboards
   */
  public static async processLeaderboardUpdates(
    leaderboards: ScoreSaberLeaderboard[],
    rankedMapDiffs: Map<string, LeaderboardDifficulty[]>
  ): Promise<LeaderboardUpdates> {
    const leaderboardUpdates: LeaderboardUpdates = {
      updatedScoresCount: 0,
      updatedLeaderboardsCount: 0,
      updatedLeaderboards: [],
    };

    Logger.info(`Processing ${leaderboards.length} leaderboards...`);

    // Process leaderboards in batches of 100
    const batches = [];
    for (let i = 0; i < leaderboards.length; i += BATCH_SIZE) {
      batches.push(leaderboards.slice(i, i + BATCH_SIZE));
    }

    let checkedCount = 0;
    for (const batch of batches) {
      // Fetch all previous leaderboards for this batch in one query
      const previousLeaderboards = await ScoreSaberLeaderboardModel.find({
        _id: { $in: batch.map(l => l.id) },
      }).lean();

      // Create a map for quick lookup
      const previousLeaderboardMap = new Map(previousLeaderboards.map(l => [Number(l._id), l]));

      // Prepare bulk operations for leaderboards
      const leaderboardBulkOps = [];
      const leaderboardsToHandle = [];

      // Process batch to categorize leaderboards
      for (const leaderboard of batch) {
        checkedCount++;
        const previousLeaderboard = previousLeaderboardMap.get(leaderboard.id);

        if (!previousLeaderboard) {
          // New leaderboard - add to bulk insert
          leaderboardBulkOps.push({
            insertOne: {
              document: {
                ...leaderboard,
                _id: leaderboard.id,
                lastRefreshed: new Date(),
              },
            },
          });
          continue;
        }

        const update = LeaderboardService.checkLeaderboardChanges(leaderboard, previousLeaderboard);
        if (
          update.rankedStatusChanged ||
          update.starCountChanged ||
          update.qualifiedStatusChanged
        ) {
          // Leaderboard needs special handling
          leaderboardsToHandle.push({ leaderboard, update });
        } else {
          // Regular update - add to bulk update
          const updatedLeaderboard = LeaderboardService.updateLeaderboardDifficulties(
            leaderboard,
            rankedMapDiffs
          );
          leaderboardBulkOps.push({
            updateOne: {
              filter: { _id: leaderboard.id },
              update: {
                $set: {
                  ...updatedLeaderboard,
                  _id: leaderboard.id,
                  lastRefreshed: new Date(),
                },
              },
            },
          });
        }
      }

      // Execute bulk leaderboard operations
      if (leaderboardBulkOps.length > 0) {
        await ScoreSaberLeaderboardModel.bulkWrite(leaderboardBulkOps);
      }

      // Handle leaderboards that need special processing
      if (leaderboardsToHandle.length > 0) {
        Logger.info(
          `Processing ${leaderboardsToHandle.length} leaderboards that need special handling...`
        );

        for (let i = 0; i < leaderboardsToHandle.length; i++) {
          const { leaderboard, update } = leaderboardsToHandle[i];

          Logger.info(
            `Processing leaderboard ${i + 1}/${leaderboardsToHandle.length}: ${leaderboard.id} (${leaderboard.songName})`
          );

          const updatedScores = await LeaderboardRankingService.handleLeaderboardUpdate(update);

          // Save the leaderboard after handling
          const updatedLeaderboard = LeaderboardService.updateLeaderboardDifficulties(
            leaderboard,
            rankedMapDiffs
          );
          await ScoreSaberLeaderboardModel.findOneAndUpdate(
            { _id: leaderboard.id },
            {
              $set: {
                ...updatedLeaderboard,
                lastRefreshed: new Date(),
              },
            },
            { upsert: true, new: true }
          );

          // Update counters directly
          leaderboardUpdates.updatedScoresCount += updatedScores;
          leaderboardUpdates.updatedLeaderboardsCount++;
          leaderboardUpdates.updatedLeaderboards.push({
            leaderboard,
            update,
          });

          Logger.info(
            `Completed leaderboard ${i + 1}/${leaderboardsToHandle.length}: ${leaderboard.id} - Updated ${updatedScores} scores`
          );
        }
      }

      if (checkedCount % 100 === 0) {
        Logger.info(`Checked ${checkedCount}/${leaderboards.length} leaderboards`);
      }
    }

    Logger.info(
      `Finished processing ${leaderboardUpdates.updatedScoresCount} leaderboard score updates and ${leaderboardUpdates.updatedLeaderboardsCount} leaderboard updates.`
    );
    return leaderboardUpdates;
  }

  /**
   * Checks if a leaderboard's ranked status, qualified status, or star count has changed
   */
  public static checkLeaderboardChanges(
    leaderboard: ScoreSaberLeaderboard,
    previousLeaderboard: ScoreSaberLeaderboard
  ): LeaderboardUpdate {
    return {
      leaderboard,
      previousLeaderboard,
      rankedStatusChanged: leaderboard.ranked !== previousLeaderboard?.ranked,
      qualifiedStatusChanged: leaderboard.qualified !== previousLeaderboard?.qualified,
      starCountChanged: leaderboard.stars !== previousLeaderboard?.stars,
    };
  }

  /**
   * Updates the difficulties map for a given leaderboard
   */
  public static updateRankedMapDifficulties(
    rankedMapDiffs: Map<string, LeaderboardDifficulty[]>,
    leaderboard: ScoreSaberLeaderboard
  ): void {
    const difficulties = rankedMapDiffs.get(leaderboard.songHash) ?? [];
    difficulties.push({
      leaderboardId: leaderboard.id,
      difficulty: leaderboard.difficulty.difficulty,
      characteristic: leaderboard.difficulty.characteristic,
      difficultyRaw: leaderboard.difficulty.difficultyRaw,
    });
    rankedMapDiffs.set(leaderboard.songHash, difficulties);
  }
}
