import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { CooldownPriority } from "@ssr/common/cooldown";
import { DetailType } from "@ssr/common/detail-type";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger from "@ssr/common/logger";
import {
  ScoreSaberLeaderboard,
  ScoreSaberLeaderboardModel,
} from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import LeaderboardDifficulty from "@ssr/common/model/leaderboard/leaderboard-difficulty";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { removeObjectFields } from "@ssr/common/object.util";
import { LeaderboardResponse } from "@ssr/common/response/leaderboard-response";
import { MapDifficulty } from "@ssr/common/score/map-difficulty";
import { getScoreSaberLeaderboardFromToken } from "@ssr/common/token-creators";
import { MapCharacteristic } from "@ssr/common/types/map-characteristic";
import { getDifficulty } from "@ssr/common/utils/song-utils";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import SuperJSON from "superjson";
import { redisClient } from "../../common/redis";
import { LeaderboardData, LeaderboardOptions } from "../../common/types/leaderboard";
import { LeaderboardScoreSeedQueue } from "../../queue/impl/leaderboard-score-seed-queue";
import { QueueId, QueueManager } from "../../queue/queue-manager";
import BeatSaverService from "../beatsaver.service";
import CacheService, { CacheId } from "../cache.service";
import { LeaderboardService } from "./leaderboard.service";

const LEADERBOARD_REFRESH_TIME = TimeUnit.toMillis(TimeUnit.Day, 3);
const DEFAULT_OPTIONS: LeaderboardOptions = {
  cacheOnly: false,
  includeBeatSaver: false,
  includeStarChangeHistory: false,
  beatSaverType: DetailType.BASIC,
  type: DetailType.BASIC,
};

export class LeaderboardCoreService {
  /**
   * Gets a ScoreSaber leaderboard by ID.
   *
   * @param id the ID of the leaderboard to get
   * @param options the options to use for the fetch
   * @returns the fetched leaderboard
   */
  public static async getLeaderboard(
    id: string,
    options?: LeaderboardOptions
  ): Promise<LeaderboardResponse> {
    const defaultOptions = {
      ...DEFAULT_OPTIONS,
      ...options,
    };

    // Get or fetch leaderboard data
    const leaderboardData = await CacheService.fetchWithCache(
      CacheId.Leaderboards,
      `leaderboard:id:${id}`,
      async () => {
        const cachedLeaderboard = await ScoreSaberLeaderboardModel.findById(id).lean();
        const { cached, foundLeaderboard } = LeaderboardService.validateCachedLeaderboard(
          cachedLeaderboard,
          options
        );

        let leaderboard = foundLeaderboard;
        if (!leaderboard) {
          leaderboard = await LeaderboardService.fetchAndSaveLeaderboard(id);
          if (leaderboard.ranked) {
            (
              QueueManager.getQueue(QueueId.LeaderboardScoreSeedQueue) as LeaderboardScoreSeedQueue
            ).add({
              id: leaderboard.id.toString(),
              data: leaderboard.id,
            });
          }
        }

        return await LeaderboardService.createLeaderboardData(leaderboard, cached);
      }
    );

    // Get BeatSaver data if needed
    const beatSaverMap = defaultOptions.includeBeatSaver
      ? await LeaderboardService.fetchBeatSaverData(
          leaderboardData.leaderboard,
          defaultOptions.beatSaverType
        )
      : undefined;

    const starChangeHistory = defaultOptions.includeStarChangeHistory
      ? await LeaderboardService.fetchStarChangeHistory(leaderboardData.leaderboard)
      : undefined;

    return {
      leaderboard: leaderboardData.leaderboard,
      beatsaver: beatSaverMap,
      starChangeHistory,
      cached: leaderboardData.cached,
    };
  }

  /**
   * Gets a ScoreSaber leaderboard by hash.
   *
   * @param hash the hash of the leaderboard to get
   * @param difficulty the difficulty of the leaderboard to get
   * @param characteristic the characteristic of the leaderboard to get
   * @param options the options to use for the fetch
   * @returns the fetched leaderboard
   */
  public static async getLeaderboardByHash(
    hash: string,
    difficulty: MapDifficulty,
    characteristic: MapCharacteristic,
    options?: LeaderboardOptions
  ): Promise<LeaderboardResponse> {
    const defaultOptions = {
      ...DEFAULT_OPTIONS,
      ...options,
    };

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

        const { cached, foundLeaderboard } = LeaderboardService.validateCachedLeaderboard(
          cachedLeaderboard,
          options
        );

        let leaderboard = foundLeaderboard;
        if (!leaderboard) {
          leaderboard = await LeaderboardService.fetchAndSaveLeaderboardByHash(
            hash,
            difficulty,
            characteristic
          );
          if (leaderboard.ranked) {
            (
              QueueManager.getQueue(QueueId.LeaderboardScoreSeedQueue) as LeaderboardScoreSeedQueue
            ).add({
              id: leaderboard.id.toString(),
              data: leaderboard.id,
            });
          }
        }

        return await LeaderboardService.createLeaderboardData(leaderboard, cached);
      }
    );

    // Get BeatSaver data if needed
    const beatSaverMap = defaultOptions.includeBeatSaver
      ? await LeaderboardService.fetchBeatSaverData(
          leaderboardData.leaderboard,
          defaultOptions.beatSaverType
        )
      : undefined;

    return {
      leaderboard: leaderboardData.leaderboard,
      beatsaver: beatSaverMap,
      cached: leaderboardData.cached,
    };
  }

  /**
   * Gets multiple ScoreSaber leaderboards by IDs efficiently.
   *
   * @param ids the IDs of the leaderboards to get
   * @param options the options to use for the fetch
   * @returns the fetched leaderboards
   */
  public static async getLeaderboards(
    ids: string[],
    options?: LeaderboardOptions
  ): Promise<LeaderboardResponse[]> {
    const defaultOptions = { ...DEFAULT_OPTIONS, ...options };
    const results = new Map<string, LeaderboardData | null>();

    // Deduplicate IDs to avoid processing the same leaderboard multiple times
    const uniqueIds = [...new Set(ids)];

    // Check Redis cache
    const cacheKeys = uniqueIds.map(id => `leaderboard:id:${id}`);
    const cachedData = await Promise.all(cacheKeys.map(key => redisClient.get(key)));

    const uncachedIds = uniqueIds.filter((id, i) => {
      const cached = cachedData[i];
      if (cached) {
        try {
          const data = SuperJSON.parse(cached) as LeaderboardData;
          results.set(id, data);
          return false;
        } catch {
          Logger.warn(`Failed to parse cached data for leaderboard ${id}, removing from cache`);
          redisClient.del(cacheKeys[i]).catch(() => {});
        }
      }
      return true;
    });

    // Check MongoDB cache
    const numericIds = uncachedIds.map(id => Number(id)).filter(id => !isNaN(id));
    const CHUNK_SIZE = 100;
    const mongoCachedLeaderboards: ScoreSaberLeaderboard[] = [];

    for (let i = 0; i < numericIds.length; i += CHUNK_SIZE) {
      const chunk = numericIds.slice(i, i + CHUNK_SIZE);
      const chunkResults = await ScoreSaberLeaderboardModel.find({ _id: { $in: chunk } }).lean();
      mongoCachedLeaderboards.push(...chunkResults);
    }

    const mongoMap = new Map(mongoCachedLeaderboards.map(lb => [lb._id!.toString(), lb]));
    const stillUncachedIds: string[] = [];

    // Process MongoDB results
    await Promise.all(
      uncachedIds.map(async id => {
        const cached = mongoMap.get(id) || null;
        const { cached: isCached, foundLeaderboard } = LeaderboardService.validateCachedLeaderboard(
          cached,
          options
        );

        if (foundLeaderboard) {
          const data = await LeaderboardService.createLeaderboardData(foundLeaderboard, isCached);
          await redisClient.set(
            `leaderboard:id:${id}`,
            SuperJSON.stringify(data),
            "EX",
            TimeUnit.toSeconds(TimeUnit.Hour, 2)
          );
          results.set(id, data);
        } else {
          stillUncachedIds.push(id);
        }
      })
    );

    // Fetch from API
    await Promise.all(
      stillUncachedIds.map(async id => {
        try {
          const leaderboard = await LeaderboardService.fetchAndSaveLeaderboard(id);
          const data = await LeaderboardService.createLeaderboardData(leaderboard, false);
          await redisClient.set(
            `leaderboard:id:${id}`,
            SuperJSON.stringify(data),
            "EX",
            TimeUnit.toSeconds(TimeUnit.Hour, 2)
          );
          results.set(id, data);
        } catch (error) {
          Logger.warn(`Failed to fetch leaderboard for ID ${id}:`, error);
          results.set(id, null);
        }
      })
    );

    const allLeaderboards = uniqueIds
      .map(id => results.get(id))
      .filter((data): data is LeaderboardData => data !== null);

    // Add BeatSaver data if needed
    if (defaultOptions.includeBeatSaver) {
      await Promise.all(
        allLeaderboards.map(async data => {
          const beatsaver = await LeaderboardService.fetchBeatSaverData(
            data.leaderboard,
            defaultOptions.beatSaverType
          );
          (data as LeaderboardResponse).beatsaver = beatsaver;
        })
      );
    }

    return allLeaderboards as LeaderboardResponse[];
  }

  /**
   * Fetches all leaderboards from the ScoreSaber API with pagination
   *
   * @param filter the filter to use for the fetch
   * @returns the fetched leaderboards
   */
  public static async fetchAllLeaderboards(filter: {
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
        .lookupLeaderboards(page, { ...filter, priority: CooldownPriority.LOW });
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
        LeaderboardService.updateRankedMapDifficulties(rankedMapDiffs, leaderboard);
      }

      hasMorePages = page < totalPages;
      page++;
    }

    return { leaderboards, rankedMapDiffs };
  }

  /**
   * Saves a leaderboard to the database.
   *
   * @param id the ID of the leaderboard to save
   * @param leaderboard the leaderboard to save
   * @returns the saved leaderboard
   */
  public static async saveLeaderboard(
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
   * Checks if a cached leaderboard should be used based on ranking and refresh time
   *
   * @param cachedLeaderboard the cached leaderboard to validate
   * @param options the options to use for the validation
   * @returns the validation result
   */
  public static validateCachedLeaderboard(
    cachedLeaderboard: ScoreSaberLeaderboard | null,
    options?: { cacheOnly?: boolean }
  ): { cached: boolean; foundLeaderboard?: ScoreSaberLeaderboard } {
    if (!cachedLeaderboard) return { cached: false };

    const now = new Date();
    const shouldUseCache =
      cachedLeaderboard.ranked ||
      options?.cacheOnly ||
      (cachedLeaderboard.lastRefreshed &&
        now.getTime() - cachedLeaderboard.lastRefreshed.getTime() < LEADERBOARD_REFRESH_TIME);

    return shouldUseCache
      ? { cached: true, foundLeaderboard: cachedLeaderboard }
      : { cached: true };
  }

  /**
   * Process a leaderboard
   *
   * @param leaderboard the leaderboard to process
   * @returns the processed leaderboard
   */
  public static processLeaderboard(leaderboard: ScoreSaberLeaderboard): ScoreSaberLeaderboard {
    const processed = LeaderboardService.leaderboardToObject(leaderboard);
    if (!processed.fullName) {
      processed.fullName = `${processed.songName} ${processed.songSubName}`.trim();
    }
    return processed as ScoreSaberLeaderboard;
  }

  /**
   * Updates the difficulties for a leaderboard
   *
   * @param leaderboard the leaderboard to update the difficulties for
   * @param rankedMapDiffs the map of ranked difficulties
   * @returns the updated leaderboard
   */
  public static updateLeaderboardDifficulties(
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
   * Fetches a leaderboard from the API and saves it
   *
   * @param id the ID of the leaderboard to fetch
   * @returns the fetched leaderboard
   */
  public static async fetchAndSaveLeaderboard(id: string): Promise<ScoreSaberLeaderboard> {
    const leaderboardToken = await ApiServiceRegistry.getInstance()
      .getScoreSaberService()
      .lookupLeaderboard(id);
    if (leaderboardToken == undefined) {
      throw new NotFoundError(`Leaderboard not found for "${id}"`);
    }

    return await LeaderboardService.saveLeaderboard(
      id,
      getScoreSaberLeaderboardFromToken(leaderboardToken)
    );
  }

  /**
   * Fetches BeatSaver data for a leaderboard
   *
   * @param leaderboard the leaderboard to fetch BeatSaver data for
   * @param beatSaverType the type of BeatSaver data to fetch
   * @returns the BeatSaver data
   */
  public static async fetchBeatSaverData(
    leaderboard: ScoreSaberLeaderboard,
    beatSaverType?: DetailType
  ) {
    try {
      return await BeatSaverService.getMap(
        leaderboard.songHash,
        leaderboard.difficulty.difficulty,
        leaderboard.difficulty.characteristic,
        beatSaverType ?? DetailType.BASIC
      );
    } catch (error) {
      Logger.warn(`Failed to fetch BeatSaver data for leaderboard ${leaderboard.id}:`, error);
      return undefined;
    }
  }

  /**
   * Creates a leaderboard data object from a leaderboard
   *
   * @param leaderboard the leaderboard to create a data object from
   * @param cached whether the leaderboard is cached
   * @returns a leaderboard data object
   */
  public static async createLeaderboardData(
    leaderboard: ScoreSaberLeaderboard,
    cached: boolean
  ): Promise<LeaderboardData> {
    const processed = LeaderboardService.processLeaderboard(leaderboard);
    return {
      leaderboard: processed,
      cached,
    };
  }

  /**
   * Fetches a leaderboard by hash from the API and saves it
   */
  public static async fetchAndSaveLeaderboardByHash(
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

    return await LeaderboardService.saveLeaderboard(
      leaderboardToken.id + "",
      getScoreSaberLeaderboardFromToken(leaderboardToken)
    );
  }

  /**
   * Updates the play counts for all leaderboards
   */
  public static async updateLeaderboardPlayCounts() {
    Logger.info(`[LEADERBOARD] Updating leaderboard play counts...`);
    const before = performance.now();

    try {
      // Calculate time boundaries once
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - TimeUnit.toMillis(TimeUnit.Day, 1));
      const sevenDaysAgo = new Date(now.getTime() - TimeUnit.toMillis(TimeUnit.Day, 7));

      // Use separate optimized queries for better performance
      const [dailyPlayCounts, weeklyPlayCounts] = await Promise.all([
        // Get daily play counts (last 24 hours)
        ScoreSaberScoreModel.aggregate([
          {
            $match: {
              timestamp: { $gte: oneDayAgo },
            },
          },
          {
            $group: {
              _id: "$leaderboardId",
              dailyCount: { $sum: 1 },
            },
          },
        ]).hint({ timestamp: -1 }), // Use timestamp index for time-based queries

        // Get weekly play counts (last 7 days)
        ScoreSaberScoreModel.aggregate([
          {
            $match: {
              timestamp: { $gte: sevenDaysAgo },
            },
          },
          {
            $group: {
              _id: "$leaderboardId",
              weeklyCount: { $sum: 1 },
            },
          },
        ]).hint({ timestamp: -1 }), // Use timestamp index for time-based queries
      ]);

      // Create maps for quick lookup
      const dailyPlaysMap = new Map(
        dailyPlayCounts.map((item: { _id: number; dailyCount: number }) => [
          item._id.toString(),
          item.dailyCount,
        ])
      );
      const weeklyPlaysMap = new Map(
        weeklyPlayCounts.map((item: { _id: number; weeklyCount: number }) => [
          item._id.toString(),
          item.weeklyCount,
        ])
      );

      // Get all leaderboard IDs that need updating
      const leaderboardIds = new Set([...dailyPlaysMap.keys(), ...weeklyPlaysMap.keys()]);

      if (leaderboardIds.size === 0) {
        Logger.info(`[LEADERBOARD] No leaderboards to update`);
        return;
      }

      // Process in batches to avoid memory issues with large datasets
      const batchSize = 1000;
      const leaderboardIdArray = Array.from(leaderboardIds);
      let totalModified = 0;

      for (let i = 0; i < leaderboardIdArray.length; i += batchSize) {
        const batch = leaderboardIdArray.slice(i, i + batchSize);

        // Prepare bulk operations for this batch
        const bulkOps = batch.map(leaderboardId => ({
          updateOne: {
            filter: { _id: Number(leaderboardId) },
            update: {
              dailyPlays: dailyPlaysMap.get(leaderboardId) || 0,
              weeklyPlays: weeklyPlaysMap.get(leaderboardId) || 0,
            },
          },
        }));

        // Execute bulk update for this batch
        const result = await ScoreSaberLeaderboardModel.bulkWrite(bulkOps);
        totalModified += result.modifiedCount || 0;
      }

      const timeTaken = performance.now() - before;
      Logger.info(
        `[LEADERBOARD] Updated ${totalModified} leaderboard play counts in ${timeTaken}ms`
      );
    } catch (error) {
      Logger.error(`[LEADERBOARD] Error updating leaderboard play counts:`, error);
      throw error;
    }
  }

  /**
   * Converts a database leaderboard to a ScoreSaberLeaderboard.
   */
  public static leaderboardToObject(leaderboard: ScoreSaberLeaderboard): ScoreSaberLeaderboard {
    return {
      ...removeObjectFields<ScoreSaberLeaderboard>(leaderboard, ["_id", "__v"]),
      id: leaderboard._id,
    } as ScoreSaberLeaderboard;
  }
}
