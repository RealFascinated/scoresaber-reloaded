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
import { removeObjectFields } from "@ssr/common/object.util";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import { LeaderboardResponse } from "@ssr/common/response/leaderboard-response";
import { MapDifficulty } from "@ssr/common/score/map-difficulty";
import { getScoreSaberLeaderboardFromToken } from "@ssr/common/token-creators";
import { MapCharacteristic } from "@ssr/common/types/map-characteristic";
import ScoreSaberLeaderboardToken from "@ssr/common/types/token/scoresaber/leaderboard";
import { formatDuration } from "@ssr/common/utils/time-utils";
import SuperJSON from "superjson";
import { redisClient } from "../../common/redis";
import { LeaderboardData, LeaderboardOptions } from "../../common/types/leaderboard";
import { LeaderboardScoreSeedQueue } from "../../queue/impl/leaderboard-score-seed-queue";
import { QueueId, QueueManager } from "../../queue/queue-manager";
import BeatSaverService from "../beatsaver.service";
import CacheService, { CacheId } from "../cache.service";
import { LeaderboardRankingService } from "./leaderboard-ranking.service";

const DEFAULT_OPTIONS: LeaderboardOptions = {
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

    const leaderboardData = await CacheService.fetchWithCache(
      CacheId.Leaderboards,
      `leaderboard:id:${id}`,
      async () => {
        const cachedLeaderboard = await ScoreSaberLeaderboardModel.findById(id).lean();
        if (cachedLeaderboard) {
          return LeaderboardCoreService.processLeaderboard(cachedLeaderboard, true);
        }

        return await LeaderboardCoreService.createLeaderboard(id);
      }
    );

    let beatSaverMap: BeatSaverMapResponse | undefined;
    if (defaultOptions.includeBeatSaver) {
      beatSaverMap = await LeaderboardCoreService.fetchBeatSaverData(
        leaderboardData.leaderboard!,
        defaultOptions.beatSaverType
      );
    }

    return {
      leaderboard: leaderboardData.leaderboard,
      beatsaver: beatSaverMap,
      starChangeHistory: defaultOptions.includeStarChangeHistory
        ? await LeaderboardRankingService.fetchStarChangeHistory(leaderboardData.leaderboard)
        : undefined,
      cached: leaderboardData.cached,
    };
  }

  /**
   * Checks if a leaderboard exists.
   *
   * @param id the ID of the leaderboard to check
   * @returns whether the leaderboard exists
   */
  public static async leaderboardExists(id: string): Promise<boolean> {
    return (await ScoreSaberLeaderboardModel.exists({ _id: id })) !== null;
  }

  /**
   * Fetches a leaderboard from the ScoreSaber API and saves it to the database.
   *
   * @param id the ID of the leaderboard to fetch
   * @param token the ScoreSaber leaderboard token to use
   * @returns the fetched leaderboard
   */
  public static async createLeaderboard(
    id: string,
    token?: ScoreSaberLeaderboardToken
  ): Promise<LeaderboardResponse> {
    const before = performance.now();
    const leaderboardToken =
      token ??
      (await ApiServiceRegistry.getInstance().getScoreSaberService().lookupLeaderboard(id));
    if (leaderboardToken == undefined) {
      throw new NotFoundError(`Leaderboard not found for "${id}"`);
    }

    const data = LeaderboardCoreService.processLeaderboard(
      await LeaderboardCoreService.saveLeaderboard(
        id,
        getScoreSaberLeaderboardFromToken(leaderboardToken)
      ),
      false
    );

    (QueueManager.getQueue(QueueId.LeaderboardScoreSeedQueue) as LeaderboardScoreSeedQueue).add({
      id: data.leaderboard.id.toString(),
      data: data.leaderboard.id,
    });

    Logger.info(`Created leaderboard "${id}" in ${formatDuration(performance.now() - before)}`);
    return data;
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
    options = { ...DEFAULT_OPTIONS, ...options };
    const leaderboardIds = [...new Set(ids)]; // deduplicate IDs
    const leaderboards = new Map<string, LeaderboardResponse | null>();

    // Get cached leaderboards from Redis
    const cacheKeys = leaderboardIds.map(id => `leaderboard:id:${id}`);
    const cachedData = cacheKeys.length > 0 ? await redisClient.mget(cacheKeys) : [];
    for (const [index] of cacheKeys.entries()) {
      const cached = cachedData[index];
      if (cached) {
        leaderboards.set(leaderboardIds[index], SuperJSON.parse(cached) as LeaderboardResponse);
      }
    }

    // Get leaderboards from Mongo or ScoreSaber API
    const uncachedIds = leaderboardIds.filter(id => !leaderboards.has(id));
    await Promise.all(
      uncachedIds.map(async id => {
        leaderboards.set(id, await LeaderboardCoreService.getLeaderboard(id));
      })
    );

    // Fetch BeatSaver data for all leaderboards
    const allLeaderboards = Array.from(leaderboards.values()).filter(
      (data): data is LeaderboardResponse => data !== null
    );
    await Promise.all(
      allLeaderboards.map(async data => {
        const beatsaver = await LeaderboardCoreService.fetchBeatSaverData(
          data.leaderboard,
          options.beatSaverType
        );
        data.beatsaver = beatsaver;
      })
    );

    return allLeaderboards;
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
    options = {
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
        if (cachedLeaderboard) {
          return LeaderboardCoreService.processLeaderboard(cachedLeaderboard, true);
        }

        const before = performance.now();
        const leaderboardToken = await ApiServiceRegistry.getInstance()
          .getScoreSaberService()
          .lookupLeaderboardByHash(hash, difficulty, characteristic);
        if (leaderboardToken == undefined) {
          throw new NotFoundError(
            `Leaderboard not found for hash "${hash}", difficulty "${difficulty}", characteristic "${characteristic}"`
          );
        }

        const leaderboard = await LeaderboardCoreService.saveLeaderboard(
          leaderboardToken.id + "",
          getScoreSaberLeaderboardFromToken(leaderboardToken)
        );

        (QueueManager.getQueue(QueueId.LeaderboardScoreSeedQueue) as LeaderboardScoreSeedQueue).add(
          {
            id: leaderboard.id.toString(),
            data: leaderboard.id,
          }
        );

        Logger.info(
          `Created leaderboard "${leaderboard.id}" in ${formatDuration(performance.now() - before)}`
        );
        return LeaderboardCoreService.processLeaderboard(leaderboard, false);
      }
    );

    let beatSaverMap: BeatSaverMapResponse | undefined;
    if (options.includeBeatSaver) {
      beatSaverMap = await LeaderboardCoreService.fetchBeatSaverData(
        leaderboardData.leaderboard,
        options.beatSaverType
      );
    }

    return {
      leaderboard: leaderboardData.leaderboard,
      beatsaver: beatSaverMap,
      cached: leaderboardData.cached,
    };
  }

  /**
   * Fetches all leaderboards from the ScoreSaber API
   *
   * @param filter the filter to use for the fetch
   * @returns the fetched leaderboards
   */
  public static async fetchLeaderboardsFromAPI(filter: {
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
        LeaderboardRankingService.updateRankedMapDifficulties(rankedMapDiffs, leaderboard);
      }

      hasMorePages = page < totalPages;
      page++;
    }

    return { leaderboards, rankedMapDiffs };
  }

  /**
   * Process a leaderboard
   *
   * @param leaderboard the leaderboard to process
   * @param cached whether the leaderboard was cached
   * @returns the processed leaderboard
   */
  public static processLeaderboard(
    leaderboard: ScoreSaberLeaderboard,
    cached = false
  ): LeaderboardData {
    const processedLeaderboard = {
      ...LeaderboardCoreService.leaderboardToObject(leaderboard),
      fullName: `${leaderboard.songName} ${leaderboard.songSubName}`.trim(),
    } as ScoreSaberLeaderboard;
    return { leaderboard: processedLeaderboard, cached };
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
   * Converts a database leaderboard to a ScoreSaberLeaderboard.
   */
  public static leaderboardToObject(leaderboard: ScoreSaberLeaderboard): ScoreSaberLeaderboard {
    return {
      ...removeObjectFields<ScoreSaberLeaderboard>(leaderboard, ["_id", "__v"]),
      id: leaderboard.id ?? leaderboard._id,
    } as ScoreSaberLeaderboard;
  }
}
