import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { DetailType } from "@ssr/common/detail-type";
import { env } from "@ssr/common/env";
import { NotFoundError } from "@ssr/common/error/not-found-error";
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
import { removeObjectFields } from "@ssr/common/object.util";
import { PlaylistSong } from "@ssr/common/playlist/playlist-song";
import { generateBeatSaberPlaylist } from "@ssr/common/playlist/playlist-utils";
import { LeaderboardResponse } from "@ssr/common/response/leaderboard-response";
import { PlaysByHmdResponse } from "@ssr/common/response/plays-by-hmd-response";
import { MapDifficulty } from "@ssr/common/score/map-difficulty";
import { getScoreSaberLeaderboardFromToken } from "@ssr/common/token-creators";
import { MapCharacteristic } from "@ssr/common/types/map-characteristic";
import ScoreSaberScoreToken from "@ssr/common/types/token/scoresaber/score";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import { formatDate, formatDuration } from "@ssr/common/utils/time-utils";
import { EmbedBuilder } from "discord.js";
import { DiscordChannels, logToChannel, sendFile } from "../../bot/bot";
import { generateRankedBatchPlaylistImage } from "../../common/playlist.util";
import BeatSaverService from "../beatsaver.service";
import CacheService, { CacheId } from "../cache.service";
import PlaylistService from "../playlist.service";

const CACHE_REFRESH_TIME = 1000 * 60 * 60 * 12; // 12 hours

type RefreshResult = {
  refreshedLeaderboards: number;
  updatedScoresCount: number;
  updatedLeaderboardsCount: number;
};

type LeaderboardUpdate = {
  leaderboard: ScoreSaberLeaderboard;
  previousLeaderboard: ScoreSaberLeaderboard;
  rankedStatusChanged: boolean;
  starCountChanged: boolean;
  qualifiedStatusChanged: boolean;
};

type LeaderboardUpdates = {
  updatedScoresCount: number;
  updatedLeaderboardsCount: number;
  updatedLeaderboards: {
    leaderboard: ScoreSaberLeaderboard;
    update: LeaderboardUpdate;
  }[];
};

type LeaderboardOptions = {
  cacheOnly?: boolean;
  includeBeatSaver?: boolean;
  beatSaverType?: DetailType;
  type?: DetailType;
  search?: string;
};

type LeaderboardData = {
  leaderboard: ScoreSaberLeaderboard;
  cached: boolean;
  trackedScores: number;
};

export default class LeaderboardService {
  /**
   * Default options for leaderboard operations
   */
  private static getDefaultOptions(
    options?: LeaderboardOptions
  ): Required<Pick<LeaderboardOptions, "includeBeatSaver" | "beatSaverType">> {
    return {
      includeBeatSaver: true,
      beatSaverType: DetailType.BASIC,
      ...options,
    };
  }

  /**
   * Checks if a cached leaderboard should be used based on ranking and refresh time
   */
  private static validateCachedLeaderboard(
    cachedLeaderboard: ScoreSaberLeaderboard | null,
    options?: { cacheOnly?: boolean }
  ): { cached: boolean; foundLeaderboard?: ScoreSaberLeaderboard } {
    if (cachedLeaderboard === null) {
      return { cached: false };
    }

    const now = new Date();

    // Use cache if:
    // 1. The map is ranked
    // 2. We're requested to only use cache
    // 3. The cache is fresh (less than 12 hours old)
    if (
      cachedLeaderboard.ranked ||
      options?.cacheOnly ||
      (cachedLeaderboard.lastRefreshed &&
        now.getTime() - cachedLeaderboard.lastRefreshed.getTime() < CACHE_REFRESH_TIME)
    ) {
      return {
        cached: true,
        foundLeaderboard: cachedLeaderboard,
      };
    }

    return { cached: true };
  }

  /**
   * Processes a leaderboard by setting fullName and converting to object
   */
  private static processLeaderboard(leaderboard: ScoreSaberLeaderboard): ScoreSaberLeaderboard {
    const processedLeaderboard = this.leaderboardToObject(leaderboard);
    if (!processedLeaderboard.fullName) {
      processedLeaderboard.fullName =
        `${processedLeaderboard.songName} ${processedLeaderboard.songSubName}`.trim();
    }
    return processedLeaderboard as ScoreSaberLeaderboard;
  }

  /**
   * Fetches a leaderboard from the API and saves it
   */
  private static async fetchAndSaveLeaderboard(id: string): Promise<ScoreSaberLeaderboard> {
    const leaderboardToken = await ApiServiceRegistry.getInstance()
      .getScoreSaberService()
      .lookupLeaderboard(id);
    if (leaderboardToken == undefined) {
      throw new NotFoundError(`Leaderboard not found for "${id}"`);
    }

    return await this.saveLeaderboard(id, getScoreSaberLeaderboardFromToken(leaderboardToken));
  }

  /**
   * Fetches a leaderboard by hash from the API and saves it
   */
  private static async fetchAndSaveLeaderboardByHash(
    hash: string,
    difficulty: MapDifficulty,
    characteristic: MapCharacteristic
  ): Promise<ScoreSaberLeaderboard> {
    const leaderboardToken = await ApiServiceRegistry.getInstance()
      .getScoreSaberService()
      .lookupLeaderboardByHash(hash, difficulty, characteristic);
    if (leaderboardToken == undefined) {
      throw new NotFoundError(
        `Leaderboard not found for hash "${hash}", difficulty "${difficulty}", characteristic "${characteristic}"`
      );
    }

    return await this.saveLeaderboard(
      leaderboardToken.id + "",
      getScoreSaberLeaderboardFromToken(leaderboardToken)
    );
  }

  /**
   * Creates leaderboard data object
   */
  private static async createLeaderboardData(
    leaderboard: ScoreSaberLeaderboard,
    cached: boolean,
    id: string | number
  ): Promise<LeaderboardData> {
    return {
      leaderboard: this.processLeaderboard(leaderboard),
      cached,
      trackedScores: await this.getTrackedScores(id),
    };
  }

  /**
   * Fetches BeatSaver data for a leaderboard
   */
  private static async fetchBeatSaverData(
    leaderboard: ScoreSaberLeaderboard,
    beatSaverType: DetailType
  ) {
    try {
      return await BeatSaverService.getMap(
        leaderboard.songHash,
        leaderboard.difficulty.difficulty,
        leaderboard.difficulty.characteristic,
        beatSaverType
      );
    } catch (error) {
      Logger.warn(`Failed to fetch BeatSaver data for leaderboard ${leaderboard.id}:`, error);
      return undefined;
    }
  }

  /**
   * Gets a ScoreSaber leaderboard by ID.
   */
  public static async getLeaderboard(
    id: string,
    options?: LeaderboardOptions
  ): Promise<LeaderboardResponse> {
    const defaultOptions = this.getDefaultOptions(options);

    // Get or fetch leaderboard data
    const leaderboardData = await CacheService.fetchWithCache(
      CacheId.Leaderboards,
      `leaderboard:id:${id}`,
      async () => {
        const cachedLeaderboard = await ScoreSaberLeaderboardModel.findById(id).lean();
        const { cached, foundLeaderboard } = this.validateCachedLeaderboard(
          cachedLeaderboard,
          options
        );

        let leaderboard = foundLeaderboard;
        if (!leaderboard) {
          leaderboard = await this.fetchAndSaveLeaderboard(id);
        }

        return await this.createLeaderboardData(leaderboard, cached, id);
      }
    );

    // Get BeatSaver data if needed
    const beatSaverMap = defaultOptions.includeBeatSaver
      ? await this.fetchBeatSaverData(leaderboardData.leaderboard, defaultOptions.beatSaverType)
      : undefined;

    return {
      leaderboard: leaderboardData.leaderboard,
      beatsaver: beatSaverMap,
      cached: leaderboardData.cached,
      trackedScores: leaderboardData.trackedScores,
    };
  }

  /**
   * Gets a ScoreSaber leaderboard by hash.
   */
  public static async getLeaderboardByHash(
    hash: string,
    difficulty: MapDifficulty,
    characteristic: MapCharacteristic,
    options?: LeaderboardOptions
  ): Promise<LeaderboardResponse> {
    const defaultOptions = this.getDefaultOptions(options);

    // Get or fetch leaderboard data
    const leaderboardData = await CacheService.fetchWithCache(
      CacheId.Leaderboards,
      `leaderboard:hash:${hash}:${difficulty}:${characteristic}`,
      async () => {
        const cachedLeaderboard = await ScoreSaberLeaderboardModel.findOne({
          songHash: hash,
          "difficulty.difficulty": difficulty,
          "difficulty.characteristic": characteristic,
        }).lean();

        const { cached, foundLeaderboard } = this.validateCachedLeaderboard(
          cachedLeaderboard,
          options
        );

        let leaderboard = foundLeaderboard;
        if (!leaderboard) {
          leaderboard = await this.fetchAndSaveLeaderboardByHash(hash, difficulty, characteristic);
        }

        return await this.createLeaderboardData(leaderboard, cached, leaderboard.id);
      }
    );

    // Get BeatSaver data if needed
    const beatSaverMap = defaultOptions.includeBeatSaver
      ? await this.fetchBeatSaverData(leaderboardData.leaderboard, defaultOptions.beatSaverType)
      : undefined;

    return {
      leaderboard: leaderboardData.leaderboard,
      beatsaver: beatSaverMap,
      cached: leaderboardData.cached,
      trackedScores: leaderboardData.trackedScores,
    };
  }

  /**
   * Gets multiple ScoreSaber leaderboards by IDs efficiently.
   */
  public static async getLeaderboards(
    ids: string[],
    options?: LeaderboardOptions
  ): Promise<LeaderboardResponse[]> {
    const defaultOptions = this.getDefaultOptions(options);

    // Bulk fetch leaderboards from MongoDB
    const bulkLeaderboards = await ScoreSaberLeaderboardModel.find({
      _id: { $in: ids },
    }).lean();

    // Create a map for quick lookup
    const bulkLeaderboardMap = new Map(bulkLeaderboards.map(lb => [lb._id.toString(), lb]));

    // Process each ID to get leaderboard data
    const leaderboardDataPromises = ids.map(async id => {
      const cachedLeaderboard = bulkLeaderboardMap.get(id);
      const { cached, foundLeaderboard } = this.validateCachedLeaderboard(
        cachedLeaderboard || null,
        options
      );

      let leaderboard = foundLeaderboard;
      if (!leaderboard) {
        try {
          leaderboard = await this.fetchAndSaveLeaderboard(id);
        } catch (error) {
          Logger.warn(`Failed to fetch leaderboard for ID ${id}:`, error);
          return null;
        }
      }

      return await this.createLeaderboardData(leaderboard, cached, id);
    });

    const leaderboardDataResults = await Promise.all(leaderboardDataPromises);
    const allLeaderboards = leaderboardDataResults.filter(result => result !== null);

    // Get BeatSaver data if needed
    if (defaultOptions.includeBeatSaver) {
      await Promise.all(
        allLeaderboards.map(async leaderboardData => {
          const beatsaver = await this.fetchBeatSaverData(
            leaderboardData.leaderboard,
            defaultOptions.beatSaverType
          );
          (leaderboardData as LeaderboardResponse).beatsaver = beatsaver;
        })
      );
    }

    return allLeaderboards as LeaderboardResponse[];
  }

  /**
   * Saves a leaderboard to the database.
   */
  private static async saveLeaderboard(
    id: string,
    leaderboard: ScoreSaberLeaderboard
  ): Promise<ScoreSaberLeaderboard> {
    const savedLeaderboard = await ScoreSaberLeaderboardModel.findOneAndUpdate(
      { _id: id },
      {
        ...leaderboard,
        _id: id,
        lastRefreshed: new Date(),
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    if (!savedLeaderboard) {
      throw new Error(`Failed to save leaderboard for "${id}"`);
    }

    return savedLeaderboard;
  }

  /**
   * Fetches all leaderboards from the ScoreSaber API with pagination
   */
  private static async fetchAllLeaderboards(filter: {
    ranked?: boolean;
    qualified?: boolean;
  }): Promise<{
    leaderboards: ScoreSaberLeaderboard[];
    rankedMapDiffs: Map<string, LeaderboardDifficulty[]>;
  }> {
    let page = 1;
    let hasMorePages = true;
    const leaderboards: ScoreSaberLeaderboard[] = [];
    const rankedMapDiffs: Map<string, LeaderboardDifficulty[]> = new Map();

    while (hasMorePages) {
      const response = await ApiServiceRegistry.getInstance()
        .getScoreSaberService()
        .lookupLeaderboards(page, filter);
      if (!response) {
        Logger.warn(`Failed to fetch leaderboards on page ${page}.`);
        continue;
      }

      const totalPages = Math.ceil(response.metadata.total / response.metadata.itemsPerPage);
      Logger.info(
        `Fetched ${response.leaderboards.length} leaderboards on page ${page}/${totalPages}.`
      );

      for (const token of response.leaderboards) {
        const leaderboard = getScoreSaberLeaderboardFromToken(token);
        leaderboards.push(leaderboard);
        this.updateRankedMapDifficulties(rankedMapDiffs, leaderboard);
      }

      hasMorePages = page < totalPages;
      page++;
    }

    return { leaderboards, rankedMapDiffs };
  }

  /**
   * Fetches all ranked leaderboards from the ScoreSaber API
   */
  private static async fetchAllRankedLeaderboards(): Promise<{
    leaderboards: ScoreSaberLeaderboard[];
    rankedMapDiffs: Map<string, LeaderboardDifficulty[]>;
  }> {
    return this.fetchAllLeaderboards({ ranked: true });
  }

  /**
   * Fetches all qualified leaderboards from the ScoreSaber API
   */
  private static async fetchAllQualifiedLeaderboards(): Promise<{
    leaderboards: ScoreSaberLeaderboard[];
    rankedMapDiffs: Map<string, LeaderboardDifficulty[]>;
  }> {
    return this.fetchAllLeaderboards({ qualified: true });
  }

  /**
   * Updates the difficulties map for a given leaderboard
   */
  private static updateRankedMapDifficulties(
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

  /**
   * Processes updates for all leaderboards
   */
  private static async processLeaderboardUpdates(
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
    const BATCH_SIZE = 100;
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

        const update = this.checkLeaderboardChanges(leaderboard, previousLeaderboard);
        if (
          update.rankedStatusChanged ||
          update.starCountChanged ||
          update.qualifiedStatusChanged
        ) {
          // Leaderboard needs special handling
          leaderboardsToHandle.push({ leaderboard, update });
        } else {
          // Regular update - add to bulk update
          const updatedLeaderboard = this.updateLeaderboardDifficulties(
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
              upsert: true,
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
        const batchResults = await Promise.all(
          leaderboardsToHandle.map(async ({ leaderboard, update }) => {
            const updatedScores = await this.handleLeaderboardUpdate(update);

            // Save the leaderboard after handling
            const updatedLeaderboard = this.updateLeaderboardDifficulties(
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

            return {
              leaderboard,
              update,
              updatedScores,
            };
          })
        );

        // Process results
        for (const result of batchResults) {
          if (result) {
            leaderboardUpdates.updatedScoresCount += result.updatedScores;
            leaderboardUpdates.updatedLeaderboardsCount++;
            leaderboardUpdates.updatedLeaderboards.push({
              leaderboard: result.leaderboard,
              update: result.update,
            });
          }
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
  private static checkLeaderboardChanges(
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
   * Handles updates for a single leaderboard when its status changes
   */
  private static async handleLeaderboardUpdate(update: LeaderboardUpdate): Promise<number> {
    const scores: ScoreSaberScoreDocument[] = (await ScoreSaberScoreModel.find({
      leaderboardId: update.leaderboard.id,
    }).sort({ timestamp: -1 })) as unknown as ScoreSaberScoreDocument[];

    if (!scores) {
      console.warn(`Failed to fetch local scores for leaderboard "${update.leaderboard.id}".`);
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
      const scoreTokens = await this.fetchAllLeaderboardScores(update.leaderboard.id + "");

      // Create a map of scores for quick lookup
      const scoreMap = new Map(scores.map(score => [`${score.scoreId}-${score.score}`, score]));

      // Prepare bulk operations
      const scoreBulkOps = [];
      const previousScoreBulkOps = [];

      for (const scoreToken of scoreTokens) {
        const score = scoreMap.get(`${scoreToken.id}-${scoreToken.baseScore}`);
        if (!score) continue;

        // Update score
        scoreBulkOps.push({
          updateOne: {
            filter: { _id: score._id },
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
        previousScoreBulkOps.push({
          updateMany: {
            filter: {
              playerId: score.playerId,
              leaderboardId: score.leaderboardId,
            },
            update: {
              $set: {
                pp: update.leaderboard.ranked
                  ? ApiServiceRegistry.getInstance()
                      .getScoreSaberService()
                      .getPp(update.leaderboard.stars, score.accuracy)
                  : 0,
                weight: 0,
              },
            },
          },
        });
      }

      // Execute bulk operations
      let updatedCount = 0;
      if (scoreBulkOps.length > 0) {
        const scoreResult = await ScoreSaberScoreModel.bulkWrite(scoreBulkOps);
        updatedCount = scoreResult.modifiedCount || 0;
      }
      if (previousScoreBulkOps.length > 0) {
        await ScoreSaberPreviousScoreModel.bulkWrite(previousScoreBulkOps);
      }

      return updatedCount;
    }

    return 0;
  }

  /**
   * Fetches all scores for a specific leaderboard
   */
  private static async fetchAllLeaderboardScores(
    leaderboardId: string
  ): Promise<ScoreSaberScoreToken[]> {
    const scoreTokens: ScoreSaberScoreToken[] = [];
    let currentPage = 1;
    let hasMoreScores = true;

    while (hasMoreScores) {
      const response = await ApiServiceRegistry.getInstance()
        .getScoreSaberService()
        .lookupLeaderboardScores(leaderboardId + "", currentPage);
      if (!response) {
        Logger.warn(
          `Failed to fetch scoresaber api scores for leaderboard "${leaderboardId}" on page ${currentPage}`
        );
        currentPage++;
        continue;
      }
      const totalPages = Math.ceil(response.metadata.total / response.metadata.itemsPerPage);
      Logger.info(
        `Fetched scores for leaderboard "${leaderboardId}" on page ${currentPage}/${totalPages}`
      );

      scoreTokens.push(...response.scores);
      hasMoreScores = currentPage < totalPages;
      currentPage++;
    }

    return scoreTokens;
  }

  /**
   * Updates the difficulties for a leaderboard
   */
  private static updateLeaderboardDifficulties(
    leaderboard: ScoreSaberLeaderboard,
    rankedMapDiffs: Map<string, LeaderboardDifficulty[]>
  ): ScoreSaberLeaderboard {
    const difficulties = rankedMapDiffs
      .get(leaderboard.songHash)
      ?.sort((a, b) => getDifficulty(a.difficulty).id - getDifficulty(b.difficulty).id);

    return {
      ...leaderboard,
      difficulties: difficulties ?? [],
    } as ScoreSaberLeaderboard;
  }

  /**
   * Unranks leaderboards that are no longer in the ranked list
   */
  private static async unrankOldLeaderboards(
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
   * Unranks a single leaderboard and updates its scores
   */
  private static async unrankLeaderboard(leaderboard: ScoreSaberLeaderboard): Promise<void> {
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
   * Refreshes leaderboards with common logic
   */
  private static async refreshLeaderboards(
    fetchFunction: () => Promise<{
      leaderboards: ScoreSaberLeaderboard[];
      rankedMapDiffs: Map<string, LeaderboardDifficulty[]>;
    }>,
    playlistId: "scoresaber-ranked-maps" | "scoresaber-qualified-maps",
    playlistTitle: string,
    createPlaylistFunction: () => Promise<{ title: string; image: string; songs: PlaylistSong[] }>
  ): Promise<RefreshResult> {
    Logger.info(`Refreshing ${playlistTitle.toLowerCase()} leaderboards...`);
    const before = Date.now();
    const { leaderboards, rankedMapDiffs } = await fetchFunction();
    const updatedScores = await this.processLeaderboardUpdates(leaderboards, rankedMapDiffs);

    // Update the playlist
    const playlist = await createPlaylistFunction();
    await PlaylistService.updatePlaylist(playlistId, {
      title: playlist.title,
      image: playlist.image,
      songs: playlist.songs,
    });

    await logToChannel(
      DiscordChannels.BACKEND_LOGS,
      new EmbedBuilder()
        .setTitle(`Refreshed ${leaderboards.length} ${playlistTitle.toLowerCase()} leaderboards.`)
        .setDescription(
          `Updated ${updatedScores.updatedScoresCount} scores in ${formatDuration(Date.now() - before)}`
        )
        .setColor("#00ff00")
    );

    return {
      refreshedLeaderboards: leaderboards.length,
      updatedScoresCount: updatedScores.updatedScoresCount,
      updatedLeaderboardsCount: updatedScores.updatedLeaderboardsCount,
    };
  }

  /**
   * Refreshes the ranked leaderboards
   */
  public static async refreshRankedLeaderboards(): Promise<RefreshResult> {
    const { leaderboards, rankedMapDiffs } = await this.fetchAllRankedLeaderboards();

    const result = await this.refreshLeaderboards(
      async () => ({ leaderboards, rankedMapDiffs }),
      "scoresaber-ranked-maps",
      "ranked",
      () => PlaylistService.createRankedPlaylist([])
    );

    // Handle unranking old leaderboards using the already fetched data
    const unrankedLeaderboards = await this.unrankOldLeaderboards(leaderboards);

    if (result.updatedLeaderboardsCount > 0) {
      await this.logLeaderboardUpdates(
        {
          updatedScoresCount: result.updatedScoresCount,
          updatedLeaderboardsCount: result.updatedLeaderboardsCount,
          updatedLeaderboards: [],
        },
        unrankedLeaderboards
      );
    }

    return result;
  }

  /**
   * Refreshes the qualified leaderboards
   */
  public static async refreshQualifiedLeaderboards(): Promise<RefreshResult> {
    return this.refreshLeaderboards(
      () => this.fetchAllQualifiedLeaderboards(),
      "scoresaber-qualified-maps",
      "qualified",
      () => PlaylistService.createQualifiedPlaylist()
    );
  }

  /**
   * Logs the leaderboard updates to Discord.
   */
  private static async logLeaderboardUpdates(
    updates: LeaderboardUpdates,
    unrankedLeaderboards: ScoreSaberLeaderboard[]
  ): Promise<void> {
    let file = "";

    const newlyRankedMaps = updates.updatedLeaderboards.filter(
      update => update.update.rankedStatusChanged && update.leaderboard.ranked
    );

    const starRatingChangedMaps = updates.updatedLeaderboards.filter(
      update => update.update.starCountChanged
    );
    const nerfedMaps = starRatingChangedMaps.filter(
      update => update.leaderboard.stars < update.update.previousLeaderboard?.stars
    );
    const buffedMaps = starRatingChangedMaps.filter(
      update =>
        update.leaderboard.stars > update.update.previousLeaderboard?.stars &&
        update.update.previousLeaderboard?.stars > 0
    );

    // Newly ranked maps
    for (const change of newlyRankedMaps) {
      const difficulty = getDifficultyName(getDifficulty(change.leaderboard.difficulty.difficulty));
      file += `now ranked ${change.leaderboard.fullName} (${difficulty}) mapped by ${change.leaderboard.levelAuthorName} at ${change.leaderboard.stars} stars\n`;
    }

    file += "\n";

    // Buffed maps
    for (const change of buffedMaps) {
      const difficulty = getDifficultyName(getDifficulty(change.leaderboard.difficulty.difficulty));
      file += `changed (buffed) ${change.leaderboard.fullName} (${difficulty}) mapped by ${change.leaderboard.levelAuthorName} from ${change.update.previousLeaderboard?.stars} to ${change.leaderboard.stars} stars\n`;
    }

    file += "\n";

    // Nerfed maps
    for (const change of nerfedMaps) {
      const difficulty = getDifficultyName(getDifficulty(change.leaderboard.difficulty.difficulty));
      file += `nerfed (nerf) ${change.leaderboard.fullName} (${difficulty}) mapped by ${change.leaderboard.levelAuthorName} from ${change.update.previousLeaderboard?.stars} to ${change.leaderboard.stars} stars\n`;
    }

    file += "\n";

    // Unranked maps
    for (const leaderboard of unrankedLeaderboards) {
      const difficulty = getDifficultyName(getDifficulty(leaderboard.difficulty.difficulty));
      file += `unranked ${leaderboard.fullName} (${difficulty}) mapped by ${leaderboard.levelAuthorName}\n`;
    }

    const date = formatDate(new Date(), "DD-MM-YYYY");

    await sendFile(
      DiscordChannels.RANKED_BATCH_LOGS,
      `ranked-batch-${date}.txt`,
      file.trim(),
      "<@&1338261690952978442>"
    );

    const leaderboards = PlaylistService.processLeaderboards(
      [...newlyRankedMaps, ...buffedMaps].map(update => update.leaderboard)
    );

    // Create a playlist of the changes
    const playlist = PlaylistService.createScoreSaberPlaylist(
      `scoresaber-ranked-batch-${date}`,
      `ScoreSaber Ranked Batch (${date})`,
      env.NEXT_PUBLIC_WEBSITE_NAME,
      leaderboards.maps,
      [...newlyRankedMaps, ...buffedMaps].map(update => update.leaderboard.id),
      await generateRankedBatchPlaylistImage(),
      "ranked-batch"
    );
    await PlaylistService.createPlaylist(playlist);
    await sendFile(
      DiscordChannels.RANKED_BATCH_LOGS,
      `scoresaber-ranked-batch-${date}.bplist`,
      JSON.stringify(generateBeatSaberPlaylist(playlist), null, 2)
    );
    Logger.info("Logged leaderboard changes to Discord.");
  }

  /**
   * Gets the ranked leaderboards based on the options
   */
  public static async getRankedLeaderboards(options?: {
    projection?: { [field: string]: number };
    sort?: "dateRanked" | "stars";
    /* eslint-disable @typescript-eslint/no-explicit-any */
    match?: { [field: string]: any };
  }): Promise<ScoreSaberLeaderboard[]> {
    return CacheService.fetchWithCache(
      CacheId.Leaderboards,
      `leaderboard:ranked-leaderboards-${JSON.stringify(options)}`,
      async () => {
        const leaderboards: ScoreSaberLeaderboard[] = await ScoreSaberLeaderboardModel.aggregate([
          { $match: { ranked: true, ...(options?.match ?? {}) } },
          ...(options?.projection
            ? [
                {
                  $project: {
                    ...options.projection,
                    dateRanked: 1,
                  },
                },
              ]
            : []),
          { $sort: { dateRanked: -1 } },
        ]);

        return leaderboards.map(leaderboard => this.leaderboardToObject(leaderboard));
      }
    );
  }

  /**
   * Gets all the qualified leaderboards
   */
  public static async getQualifiedLeaderboards(): Promise<ScoreSaberLeaderboard[]> {
    return CacheService.fetchWithCache(
      CacheId.Leaderboards,
      "leaderboard:qualified-leaderboards",
      async () => {
        const leaderboards = await ScoreSaberLeaderboardModel.find({ qualified: true }).lean();
        return leaderboards.map(leaderboard => this.leaderboardToObject(leaderboard));
      }
    );
  }

  /**
   * Gets the ranking queue leaderboards
   */
  public static async getRankingQueueLeaderboards(): Promise<ScoreSaberLeaderboard[]> {
    return CacheService.fetchWithCache(
      CacheId.Leaderboards,
      "leaderboard:ranking-queue-maps",
      async () => {
        const rankingQueueTokens = await ApiServiceRegistry.getInstance()
          .getScoreSaberService()
          .lookupRankingRequests();
        if (!rankingQueueTokens) {
          return [];
        }

        return rankingQueueTokens.all.map(token =>
          getScoreSaberLeaderboardFromToken(token.leaderboardInfo)
        );
      }
    );
  }

  /**
   * Gets the plays by HMD for a leaderboard
   */
  public static async getPlaysByHmd(leaderboardId: string): Promise<PlaysByHmdResponse> {
    const result = await ScoreSaberScoreModel.aggregate([
      {
        $match: {
          leaderboardId: Number(leaderboardId),
          hmd: { $exists: true, $nin: [null, "Unknown"] },
        },
      },
      {
        $group: {
          _id: "$hmd",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          hmd: "$_id",
          count: 1,
        },
      },
      {
        $sort: { count: -1 },
      },
    ]).exec();

    // Convert array of {hmd: string, count: number} to {hmd: count}
    return result.reduce((acc, curr) => {
      acc[curr.hmd] = curr.count;
      return acc;
    }, {} as PlaysByHmdResponse);
  }

  /**
   * Gets the amount of tracked scores for a leaderboard
   */
  public static async getTrackedScores(leaderboardId: number | string): Promise<number> {
    const id = Number(leaderboardId);
    if (isNaN(id)) {
      throw new Error(`Invalid leaderboardId: ${leaderboardId}`);
    }
    return ScoreSaberScoreModel.countDocuments({ leaderboardId: id });
  }

  /**
   * Converts a database leaderboard to a ScoreSaberLeaderboard.
   */
  private static leaderboardToObject(leaderboard: ScoreSaberLeaderboard): ScoreSaberLeaderboard {
    return {
      ...removeObjectFields<ScoreSaberLeaderboard>(leaderboard, ["_id", "__v"]),
      id: leaderboard._id,
    } as ScoreSaberLeaderboard;
  }
}
