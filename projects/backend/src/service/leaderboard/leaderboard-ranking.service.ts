import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { CooldownPriority } from "@ssr/common/cooldown";
import Logger from "@ssr/common/logger";
import {
  ScoreSaberLeaderboard,
  ScoreSaberLeaderboardModel,
} from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import LeaderboardDifficulty from "@ssr/common/model/leaderboard/leaderboard-difficulty";
import { ScoreSaberLeaderboardStarChangeModel } from "@ssr/common/model/leaderboard/leaderboard-star-change";
import { ScoreSaberPreviousScoreModel } from "@ssr/common/model/score/impl/scoresaber-previous-score";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { LeaderboardStarChange } from "@ssr/common/schemas/leaderboard/leaderboard-star-change";
import {
  getScoreSaberLeaderboardFromToken,
  getScoreSaberScoreFromToken,
} from "@ssr/common/token-creators";
import { formatDateMinimal } from "@ssr/common/utils/time-utils";
import PlaylistService from "../playlist/playlist.service";

export class LeaderboardRankingService {
  public static async refreshRankedLeaderboards() {
    const leaderboards: ScoreSaberLeaderboard[] = [];
    const leaderboardDifficulties: Map<string, LeaderboardDifficulty[]> = new Map();

    async function getLeaderboards() {
      let hasMorePages = true;
      let page = 1;

      while (hasMorePages) {
        const response = await ApiServiceRegistry.getInstance()
          .getScoreSaberService()
          .lookupLeaderboards(page, { ranked: true, priority: CooldownPriority.LOW });
        if (!response) {
          hasMorePages = false;
          continue;
        }

        const totalPages = Math.ceil(response.metadata.total / response.metadata.itemsPerPage);
        Logger.info(
          `Fetched ${response.leaderboards.length} leaderboards on page ${page}/${totalPages}.`
        );

        for (const token of response.leaderboards) {
          const leaderboard = getScoreSaberLeaderboardFromToken(token);
          leaderboards.push(leaderboard);

          // Since ScoreSaber only returns the difficulties for the
          // leaderboard, we need to store them in a map to fetch them all.
          const difficulties = leaderboardDifficulties.get(leaderboard.songHash) ?? [];
          difficulties.push(leaderboard.difficulty);
          leaderboardDifficulties.set(leaderboard.songHash, difficulties);
        }

        page++;
        hasMorePages = page < totalPages;
      }
    }

    async function processLeaderboards() {
      for (const apiLeaderboard of leaderboards) {
        let updateScores = false;
        const dbLeaderboard = await ScoreSaberLeaderboardModel.findOne({ _id: apiLeaderboard.id });
        if (!dbLeaderboard) {
          updateScores = true;
        } else {
          updateScores =
            dbLeaderboard.ranked !== apiLeaderboard.ranked ||
            dbLeaderboard.qualified !== apiLeaderboard.qualified ||
            dbLeaderboard.stars !== apiLeaderboard.stars;

          // The leaderboard is no longer ranked, so we need to "unrank" all of our local scores.
          if (!apiLeaderboard.ranked && dbLeaderboard.ranked) {
            await ScoreSaberScoreModel.updateMany(
              { leaderboardId: apiLeaderboard.id },
              { $set: { pp: 0, weight: 0 } }
            );
            await ScoreSaberPreviousScoreModel.updateMany(
              { leaderboardId: apiLeaderboard.id },
              { $set: { pp: 0, weight: 0 } }
            );
            continue;
          }
        }

        // Update or create the leaderboard
        await ScoreSaberLeaderboardModel.findOneAndUpdate(
          { _id: apiLeaderboard.id },
          {
            $set: {
              ...apiLeaderboard,
              difficulties: leaderboardDifficulties.get(apiLeaderboard.songHash) ?? [],
            },
          },
          { upsert: true }
        );

        // We need to update the scores and the leaderboard
        // is ranked, so we should re-scan the scores,
        if (updateScores && apiLeaderboard.ranked) {
          let hasMorePages = true;
          let page = 1;

          while (hasMorePages) {
            const response = await ApiServiceRegistry.getInstance()
              .getScoreSaberService()
              .lookupLeaderboardScores(apiLeaderboard.id + "", page);
            if (!response) {
              hasMorePages = false;
              continue;
            }

            for (const scoreToken of response.scores) {
              const score = getScoreSaberScoreFromToken(
                scoreToken,
                apiLeaderboard,
                scoreToken.leaderboardPlayerInfo.id
              );
              if (!score) {
                continue;
              }

              // Update or create the score
              await ScoreSaberScoreModel.findOneAndUpdate(
                { scoreId: score.scoreId },
                { $set: { ...score } },
                { upsert: true }
              );
            }

            page++;
            hasMorePages =
              page < Math.ceil(response.metadata.total / response.metadata.itemsPerPage);
          }
        }
      }
    }

    await getLeaderboards();
    await processLeaderboards();

    // Update the ranked playlist
    await PlaylistService.updatePlaylist("scoresaber-ranked-maps", {
      title: `ScoreSaber Ranked Maps (${formatDateMinimal(new Date())})`,
      songs: leaderboards.map(leaderboard => ({
        songName: leaderboard.songName,
        songAuthor: leaderboard.songAuthorName,
        songHash: leaderboard.songHash,
        difficulties: leaderboard.difficulties.map(difficulty => ({
          difficulty: difficulty.difficulty,
          characteristic: difficulty.characteristic,
        })),
      })),
    });
  }

  // /**
  //  * Unranks a single leaderboard and updates its scores
  //  */
  // public static async unrankLeaderboard(leaderboard: ScoreSaberLeaderboard): Promise<void> {
  //   // Use bulk operations to reset PP and weight for all scores in this leaderboard
  //   await ScoreSaberScoreModel.updateMany({ leaderboardId: leaderboard.id }, { $set: { pp: 0, weight: 0 } });

  //   // Also reset PP and weight for previous scores
  //   await ScoreSaberPreviousScoreModel.updateMany({ leaderboardId: leaderboard.id }, { $set: { pp: 0, weight: 0 } });

  //   // Update the leaderboard
  //   await ScoreSaberLeaderboardModel.findOneAndUpdate(
  //     { _id: leaderboard.id },
  //     {
  //       lastRefreshed: new Date(),
  //       ...leaderboard,
  //     },
  //     {
  //       upsert: true,
  //       setDefaultsOnInsert: true,
  //     }
  //   );
  //   Logger.info(`Previously ranked leaderboard "${leaderboard.id}" has been unranked.`);
  // }

  // /**
  //  * Unranks leaderboards that are no longer in the ranked list
  //  */
  // public static async unrankOldLeaderboards(
  //   currentLeaderboards: ScoreSaberLeaderboard[]
  // ): Promise<ScoreSaberLeaderboard[]> {
  //   const unrankedLeaderboards: ScoreSaberLeaderboard[] = [];

  //   const rankedIds = currentLeaderboards.map(leaderboard => leaderboard.id);
  //   const rankedLeaderboards = await ScoreSaberLeaderboardModel.find({
  //     ranked: true,
  //     _id: { $nin: rankedIds },
  //   });

  //   if (rankedLeaderboards.length === 0) {
  //     return unrankedLeaderboards;
  //   }

  //   // Batch API calls to check which leaderboards are still ranked
  //   const apiCheckPromises = rankedLeaderboards.map(async previousLeaderboard => {
  //     try {
  //       const leaderboard = await ApiServiceRegistry.getInstance()
  //         .getScoreSaberService()
  //         .lookupLeaderboard(previousLeaderboard.id + "");
  //       return { previousLeaderboard, isStillRanked: leaderboard?.ranked || false };
  //     } catch (error) {
  //       Logger.warn(`Failed to check leaderboard ${previousLeaderboard.id}:`, error);
  //       return { previousLeaderboard, isStillRanked: true }; // Assume still ranked on error
  //     }
  //   });

  //   const apiResults = await Promise.all(apiCheckPromises);
  //   const leaderboardsToUnrank = apiResults
  //     .filter(result => !result.isStillRanked)
  //     .map(result => result.previousLeaderboard);

  //   if (leaderboardsToUnrank.length === 0) {
  //     return unrankedLeaderboards;
  //   }

  //   // Prepare bulk operations for scores
  //   const scoreBulkOps = [];
  //   const previousScoreBulkOps = [];
  //   const leaderboardBulkOps = [];

  //   for (const leaderboard of leaderboardsToUnrank) {
  //     // Reset PP and weight for scores
  //     scoreBulkOps.push({
  //       updateMany: {
  //         filter: { leaderboardId: leaderboard.id },
  //         update: { $set: { pp: 0, weight: 0 } },
  //       },
  //     });

  //     // Reset PP and weight for previous scores
  //     previousScoreBulkOps.push({
  //       updateMany: {
  //         filter: { leaderboardId: leaderboard.id },
  //         update: { $set: { pp: 0, weight: 0 } },
  //       },
  //     });

  //     // Update leaderboard
  //     leaderboardBulkOps.push({
  //       updateOne: {
  //         filter: { _id: leaderboard.id },
  //         update: {
  //           $set: {
  //             lastRefreshed: new Date(),
  //             ranked: false,
  //             qualified: false,
  //           },
  //         },
  //       },
  //     });

  //     unrankedLeaderboards.push(leaderboard);
  //   }

  //   // Execute bulk operations
  //   if (scoreBulkOps.length > 0) {
  //     await ScoreSaberScoreModel.bulkWrite(scoreBulkOps);
  //   }
  //   if (previousScoreBulkOps.length > 0) {
  //     await ScoreSaberPreviousScoreModel.bulkWrite(previousScoreBulkOps);
  //   }
  //   if (leaderboardBulkOps.length > 0) {
  //     await ScoreSaberLeaderboardModel.bulkWrite(leaderboardBulkOps);
  //   }

  //   Logger.info(`Unranked ${leaderboardsToUnrank.length} previously ranked leaderboards.`);
  //   return unrankedLeaderboards;
  // }

  // /**
  //  * Handles updates for a single leaderboard when its status changes
  //  */
  // public static async handleLeaderboardUpdate(update: LeaderboardUpdate): Promise<number> {
  //   const scores: ScoreSaberScoreDocument[] = (await ScoreSaberScoreModel.find({
  //     leaderboardId: update.leaderboard.id,
  //   }).sort({ timestamp: -1 })) as unknown as ScoreSaberScoreDocument[];

  //   if (!scores) {
  //     Logger.warn(`Failed to fetch local scores for leaderboard "${update.leaderboard.id}".`);
  //     return 0;
  //   }

  //   // Log changes
  //   if (update.rankedStatusChanged) {
  //     Logger.info(
  //       `Leaderboard "${update.leaderboard.id}" ranked status changed from ${update.previousLeaderboard?.ranked} to ${update.leaderboard.ranked}.`
  //     );
  //   }
  //   if (update.starCountChanged) {
  //     Logger.info(
  //       `Leaderboard "${update.leaderboard.id}" star count changed from ${update.previousLeaderboard?.stars} to ${update.leaderboard.stars}.`
  //     );
  //   }

  //   if (update.rankedStatusChanged && !update.leaderboard.ranked) {
  //     // Bulk update to reset PP values for all scores in this leaderboard
  //     const result = await ScoreSaberScoreModel.updateMany(
  //       { leaderboardId: update.leaderboard.id },
  //       { $set: { pp: 0, weight: 0 } }
  //     );

  //     // Also reset PP values for previous scores
  //     await ScoreSaberPreviousScoreModel.updateMany(
  //       { leaderboardId: update.leaderboard.id },
  //       { $set: { pp: 0, weight: 0 } }
  //     );

  //     return result.modifiedCount || 0;
  //   }

  //   if (
  //     (update.starCountChanged && update.leaderboard.ranked) ||
  //     (update.rankedStatusChanged && update.leaderboard.ranked) ||
  //     (update.qualifiedStatusChanged && update.leaderboard.qualified)
  //   ) {
  //     const scoreMap = new Map(scores.map(score => [`${score.scoreId}-${score.score}`, score]));

  //     let currentPage = 1;
  //     let totalPages = 1; // will be updated after first fetch
  //     let updatedCount = 0;

  //     while (currentPage <= totalPages) {
  //       const response = await ApiServiceRegistry.getInstance()
  //         .getScoreSaberService()
  //         .lookupLeaderboardScores(update.leaderboard.id + "", currentPage);

  //       if (!response) {
  //         Logger.warn(
  //           `Failed to fetch scores for leaderboard "${update.leaderboard.id}" on page ${currentPage}. Skipping page.`
  //         );
  //         currentPage++;
  //         continue;
  //       }

  //       totalPages = Math.ceil(response.metadata.total / response.metadata.itemsPerPage);

  //       // Prepare bulk operations for this page only
  //       const scoreBulkOpsPage = [];
  //       const previousScoreBulkOpsPage = [];

  //       for (const scoreToken of response.scores) {
  //         const score = scoreMap.get(`${scoreToken.id}-${scoreToken.baseScore}`);
  //         if (!score) continue;

  //         // Update score
  //         const scoreDocument = getScoreSaberScoreFromToken(scoreToken, update.leaderboard, score.playerId);
  //         scoreBulkOpsPage.push({
  //           updateOne: {
  //             filter: { _id: score.id },
  //             update: {
  //               $set: {
  //                 ...scoreDocument,
  //                 _id: score.id,
  //               },
  //             },
  //             upsert: true,
  //           },
  //         });

  //         // Update previous scores
  //         previousScoreBulkOpsPage.push({
  //           updateMany: {
  //             filter: {
  //               playerId: score.playerId,
  //               leaderboardId: score.leaderboardId,
  //             },
  //             update: {
  //               $set: {
  //                 pp: update.leaderboard.ranked ? ScoreSaberCurve.getPp(update.leaderboard.stars, score.accuracy) : 0,
  //                 weight: 0,
  //               },
  //             },
  //           },
  //         });
  //       }

  //       // Execute bulk operations for this page
  //       if (scoreBulkOpsPage.length > 0) {
  //         const pageResult = await ScoreSaberScoreModel.bulkWrite(scoreBulkOpsPage);
  //         updatedCount += pageResult.modifiedCount || 0;
  //       }
  //       if (previousScoreBulkOpsPage.length > 0) {
  //         await ScoreSaberPreviousScoreModel.bulkWrite(previousScoreBulkOpsPage);
  //       }

  //       scoreBulkOpsPage.length = 0;
  //       previousScoreBulkOpsPage.length = 0;
  //       currentPage++;
  //     }

  //     scoreMap.clear();
  //     return updatedCount;
  //   }

  //   // Remove this leaderboard from the Redis cache
  //   await CacheService.invalidate(`leaderboard:id:${update.leaderboard.id}`);

  //   return 0;
  // }

  // /**
  //  * Processes updates for all leaderboards
  //  */
  // public static async processLeaderboardUpdates(
  //   leaderboards: ScoreSaberLeaderboard[],
  //   rankedMapDiffs: Map<string, LeaderboardDifficulty[]>
  // ): Promise<LeaderboardUpdates> {
  //   const leaderboardUpdates: LeaderboardUpdates = {
  //     updatedScoresCount: 0,
  //     updatedLeaderboardsCount: 0,
  //     updatedLeaderboards: [],
  //   };

  //   Logger.info(`Processing ${leaderboards.length} leaderboards...`);

  //   // Process leaderboards in batches of 100
  //   const batches: ScoreSaberLeaderboard[][] = [];
  //   for (let i = 0; i < leaderboards.length; i += BATCH_SIZE) {
  //     batches.push(leaderboards.slice(i, i + BATCH_SIZE));
  //   }

  //   let checkedCount = 0;
  //   for (const batch of batches) {
  //     // Fetch all previous leaderboards for this batch in one query
  //     const previousLeaderboards = await ScoreSaberLeaderboardModel.find({
  //       _id: { $in: batch.map(l => l.id) },
  //     }).lean();

  //     // Create a map for quick lookup
  //     const previousLeaderboardMap = new Map(previousLeaderboards.map(l => [Number(l._id), l]));

  //     // Prepare bulk operations for leaderboards
  //     const leaderboardBulkOps = [];
  //     const leaderboardsToHandle: Array<{
  //       leaderboard: ScoreSaberLeaderboard;
  //       update: LeaderboardUpdate;
  //     }> = [];

  //     // Process batch to categorize leaderboards
  //     for (const leaderboard of batch) {
  //       checkedCount++;
  //       const previousLeaderboard = previousLeaderboardMap.get(leaderboard.id);

  //       if (!previousLeaderboard) {
  //         // New leaderboard - add to bulk insert
  //         leaderboardBulkOps.push({
  //           insertOne: {
  //             document: {
  //               ...leaderboard,
  //               _id: leaderboard.id,
  //               lastRefreshed: new Date(),
  //             },
  //           },
  //         });
  //         continue;
  //       }

  //       const update = this.checkLeaderboardChanges(leaderboard, previousLeaderboard);
  //       if (update.rankedStatusChanged || update.starCountChanged || update.qualifiedStatusChanged) {
  //         // Leaderboard has status changes
  //         leaderboardsToHandle.push({ leaderboard, update });
  //       } else {
  //         // Regular update - add to bulk update
  //         const updatedLeaderboard = LeaderboardRankingService.updateLeaderboardDifficulties(
  //           leaderboard,
  //           rankedMapDiffs
  //         );
  //         leaderboardBulkOps.push({
  //           updateOne: {
  //             filter: { _id: leaderboard.id },
  //             update: {
  //               $set: {
  //                 ...updatedLeaderboard,
  //                 _id: leaderboard.id,
  //                 lastRefreshed: new Date(),
  //               },
  //             },
  //           },
  //         });
  //       }
  //     }

  //     // Execute bulk leaderboard operations
  //     if (leaderboardBulkOps.length > 0) {
  //       await ScoreSaberLeaderboardModel.bulkWrite(leaderboardBulkOps);
  //     }

  //     // Handle leaderboards with status changes
  //     if (leaderboardsToHandle.length > 0) {
  //       Logger.info(`Processing ${leaderboardsToHandle.length} leaderboards with status changes...`);

  //       for (let i = 0; i < leaderboardsToHandle.length; i++) {
  //         const { leaderboard, update } = leaderboardsToHandle[i];

  //         Logger.info(
  //           `Processing leaderboard ${i + 1}/${leaderboardsToHandle.length}: ${leaderboard.id} (${leaderboard.songName})`
  //         );

  //         const updatedScores = await LeaderboardRankingService.handleLeaderboardUpdate(update);

  //         // Save the leaderboard after handling
  //         const updatedLeaderboard = LeaderboardRankingService.updateLeaderboardDifficulties(
  //           leaderboard,
  //           rankedMapDiffs
  //         );
  //         await ScoreSaberLeaderboardModel.findOneAndUpdate(
  //           { _id: leaderboard.id },
  //           {
  //             $set: {
  //               ...updatedLeaderboard,
  //               lastRefreshed: new Date(),
  //             },
  //           },
  //           { upsert: true }
  //         );

  //         // Update counters directly
  //         leaderboardUpdates.updatedScoresCount += updatedScores;
  //         leaderboardUpdates.updatedLeaderboardsCount++;
  //         leaderboardUpdates.updatedLeaderboards.push({
  //           leaderboard,
  //           update,
  //         });

  //         Logger.info(
  //           `Completed leaderboard ${i + 1}/${leaderboardsToHandle.length}: ${leaderboard.id} - Updated ${updatedScores} scores`
  //         );
  //       }
  //     }

  //     if (checkedCount % 100 === 0) {
  //       Logger.info(`Checked ${checkedCount}/${leaderboards.length} leaderboards`);
  //     }
  //   }

  //   Logger.info(
  //     `Finished processing ${leaderboardUpdates.updatedScoresCount} leaderboard score updates and ${leaderboardUpdates.updatedLeaderboardsCount} leaderboard updates.`
  //   );
  //   return leaderboardUpdates;
  // }

  // /**
  //  * Checks if a leaderboard's ranked status, qualified status, or star count has changed
  //  */
  // public static checkLeaderboardChanges(
  //   leaderboard: ScoreSaberLeaderboard,
  //   previousLeaderboard: ScoreSaberLeaderboard
  // ): LeaderboardUpdate {
  //   return {
  //     leaderboard,
  //     previousLeaderboard,
  //     rankedStatusChanged: leaderboard.ranked !== previousLeaderboard?.ranked,
  //     qualifiedStatusChanged: leaderboard.qualified !== previousLeaderboard?.qualified,
  //     starCountChanged: leaderboard.stars !== previousLeaderboard?.stars,
  //   };
  // }

  // /**
  //  * Updates the difficulties map for a given leaderboard
  //  */
  // public static updateRankedMapDifficulties(
  //   rankedMapDiffs: Map<string, LeaderboardDifficulty[]>,
  //   leaderboard: ScoreSaberLeaderboard
  // ): void {
  //   const difficulties = rankedMapDiffs.get(leaderboard.songHash) ?? [];
  //   difficulties.push({
  //     leaderboardId: leaderboard.id,
  //     difficulty: leaderboard.difficulty.difficulty,
  //     characteristic: leaderboard.difficulty.characteristic,
  //     difficultyRaw: leaderboard.difficulty.difficultyRaw,
  //   });
  //   rankedMapDiffs.set(leaderboard.songHash, difficulties);
  // }

  // /**
  //  * Updates the difficulties for a leaderboard
  //  *
  //  * @param leaderboard the leaderboard to update the difficulties for
  //  * @param rankedMapDiffs the map of ranked difficulties
  //  * @returns the updated leaderboard
  //  */
  // public static updateLeaderboardDifficulties(
  //   leaderboard: ScoreSaberLeaderboard,
  //   rankedMapDiffs: Map<string, LeaderboardDifficulty[]>
  // ): ScoreSaberLeaderboard {
  //   const difficulties = rankedMapDiffs
  //     .get(leaderboard.songHash)
  //     ?.sort((a, b) => getDifficulty(a.difficulty).diffId - getDifficulty(b.difficulty).diffId);

  //   return {
  //     ...leaderboard,
  //     difficulties: difficulties ?? [],
  //   } as ScoreSaberLeaderboard;
  // }

  /**
   * Fetches the star change history for a given leaderboard
   */
  public static async fetchStarChangeHistory(
    leaderboard: ScoreSaberLeaderboard
  ): Promise<LeaderboardStarChange[]> {
    return (
      await ScoreSaberLeaderboardStarChangeModel.find({
        leaderboardId: leaderboard.id,
      })
        .lean()
        .sort({ timestamp: -1 })
    ).map(starChange => ({
      previousStars: starChange.previousStars,
      newStars: starChange.newStars,
      timestamp: starChange.timestamp,
    }));
  }
}
