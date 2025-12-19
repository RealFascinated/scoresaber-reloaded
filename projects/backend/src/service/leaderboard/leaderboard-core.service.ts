import { CooldownPriority } from "@ssr/common/cooldown";
import { DetailType } from "@ssr/common/detail-type";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger from "@ssr/common/logger";
import {
  ScoreSaberLeaderboard,
  ScoreSaberLeaderboardModel,
} from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import LeaderboardDifficulty from "@ssr/common/model/leaderboard/leaderboard-difficulty";
import { BeatSaverMapResponse } from "@ssr/common/schemas/response/beatsaver/beatsaver-map";
import { LeaderboardResponse } from "@ssr/common/schemas/response/leaderboard/leaderboard";
import { MapDifficulty } from "@ssr/common/score/map-difficulty";
import { getScoreSaberLeaderboardFromToken } from "@ssr/common/token-creators";
import { MapCharacteristic } from "@ssr/common/types/map-characteristic";
import ScoreSaberLeaderboardToken from "@ssr/common/types/token/scoresaber/leaderboard";
import { leaderboardToObject } from "@ssr/common/utils/model-converters";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { parse } from "devalue";
import { redisClient } from "../../common/redis";
import { LeaderboardScoreSeedQueue } from "../../queue/impl/leaderboard-score-seed-queue";
import { QueueId, QueueManager } from "../../queue/queue-manager";
import BeatSaverService from "../beatsaver.service";
import CacheService, { CacheId } from "../cache.service";
import { ScoreSaberApiService } from "../scoresaber-api.service";
import { LeaderboardRankingService } from "./leaderboard-ranking.service";

export type LeaderboardOptions = {
  includeBeatSaver?: boolean;
  includeStarChangeHistory?: boolean;
  beatSaverType?: DetailType;
};
const DEFAULT_OPTIONS: LeaderboardOptions = {
  includeBeatSaver: false,
  includeStarChangeHistory: false,
  beatSaverType: "basic",
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
    id: number,
    options?: LeaderboardOptions
  ): Promise<LeaderboardResponse> {
    const defaultOptions = {
      ...DEFAULT_OPTIONS,
      ...options,
    };

    if (isNaN(Number(id))) {
      throw new NotFoundError(`Leaderboard not found for "${id}"`);
    }

    const leaderboardData = await CacheService.fetchWithCache(
      CacheId.Leaderboards,
      `leaderboard:id:${id}`,
      async () => {
        const cachedLeaderboard = await ScoreSaberLeaderboardModel.findById(id).lean();
        if (cachedLeaderboard) {
          return LeaderboardCoreService.processLeaderboard(cachedLeaderboard);
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
    };
  }

  /**
   * Checks if a leaderboard exists.
   *
   * @param id the ID of the leaderboard to check
   * @returns whether the leaderboard exists
   */
  public static async leaderboardExists(id: number): Promise<boolean> {
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
    id: number,
    token?: ScoreSaberLeaderboardToken
  ): Promise<LeaderboardResponse> {
    const before = performance.now();
    const leaderboardToken = token ?? (await ScoreSaberApiService.lookupLeaderboard(id));
    if (leaderboardToken == undefined) {
      throw new NotFoundError(`Leaderboard not found for "${id}"`);
    }

    const data = LeaderboardCoreService.processLeaderboard(
      await LeaderboardCoreService.saveLeaderboard(
        id,
        getScoreSaberLeaderboardFromToken(leaderboardToken)
      )
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
    ids: number[],
    options?: LeaderboardOptions
  ): Promise<LeaderboardResponse[]> {
    options = { ...DEFAULT_OPTIONS, ...options };
    const leaderboardIds = [...new Set(ids)]; // deduplicate IDs
    const leaderboards = new Map<number, LeaderboardResponse | null>();

    // Get cached leaderboards from Redis
    const cacheKeys = leaderboardIds.map(id => `leaderboard:id:${id}`);
    const cachedData = cacheKeys.length > 0 ? await redisClient.mget(cacheKeys) : [];
    for (const [index] of cacheKeys.entries()) {
      const cached = cachedData[index];
      if (cached) {
        leaderboards.set(leaderboardIds[index], parse(cached) as LeaderboardResponse);
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
          return LeaderboardCoreService.processLeaderboard(cachedLeaderboard);
        }

        const before = performance.now();
        const leaderboardToken = await ScoreSaberApiService.lookupLeaderboardByHash(
          hash,
          difficulty,
          characteristic
        );
        if (leaderboardToken == undefined) {
          throw new NotFoundError(
            `Leaderboard not found for hash "${hash}", difficulty "${difficulty}", characteristic "${characteristic}"`
          );
        }

        const leaderboard = await LeaderboardCoreService.saveLeaderboard(
          leaderboardToken.id,
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
        return LeaderboardCoreService.processLeaderboard(leaderboard);
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
    };
  }

  /**
   * Fetches all leaderboards from the ScoreSaber API
   *
   * @param filter the filter to use for the fetch
   * @returns the fetched leaderboards
   */
  public static async fetchLeaderboardsFromAPI(
    status: "ranked" | "qualified",
    logProgress: boolean = false
  ): Promise<{
    leaderboards: ScoreSaberLeaderboard[];
    leaderboardDifficulties: Map<string, LeaderboardDifficulty[]>;
  }> {
    const leaderboards: ScoreSaberLeaderboard[] = [];
    const leaderboardDifficulties: Map<string, LeaderboardDifficulty[]> = new Map();

    let hasMorePages = true;
    let page = 1;

    while (hasMorePages) {
      const response = await ScoreSaberApiService.lookupLeaderboards(page, {
        [status]: true,
        priority: CooldownPriority.LOW,
      });
      if (!response) {
        hasMorePages = false;
        continue;
      }

      const totalPages = Math.ceil(response.metadata.total / response.metadata.itemsPerPage);
      for (const token of response.leaderboards) {
        const leaderboard = getScoreSaberLeaderboardFromToken(token);
        leaderboards.push(leaderboard);

        // Since ScoreSaber only returns the difficulties for the
        // leaderboard, we need to store them in a map to fetch them all.
        const difficulties = leaderboardDifficulties.get(leaderboard.songHash) ?? [];
        difficulties.push(leaderboard.difficulty);
        leaderboardDifficulties.set(leaderboard.songHash, difficulties);
      }

      if (logProgress && (page % 10 === 0 || page === 1 || page >= totalPages)) {
        Logger.info(
          `Fetched ${response.leaderboards.length} leaderboards on page ${page}/${totalPages}.`
        );
      }

      page++;
      hasMorePages = page < totalPages;
    }

    return { leaderboards, leaderboardDifficulties };
  }

  /**
   * Process a leaderboard
   *
   * @param leaderboard the leaderboard to process
   * @param cached whether the leaderboard was cached
   * @returns the processed leaderboard
   */
  public static processLeaderboard(leaderboard: ScoreSaberLeaderboard): LeaderboardResponse {
    const processedLeaderboard = {
      ...leaderboardToObject(leaderboard),
      fullName: `${leaderboard.songName} ${leaderboard.songSubName}`.trim(),
    } as ScoreSaberLeaderboard;
    return { leaderboard: processedLeaderboard };
  }

  /**
   * Saves a leaderboard to the database.
   *
   * @param id the ID of the leaderboard to save
   * @param leaderboard the leaderboard to save
   * @returns the saved leaderboard
   */
  public static async saveLeaderboard(
    id: number,
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
        beatSaverType ?? "basic"
      );
    } catch (error) {
      Logger.warn(`Failed to fetch BeatSaver data for leaderboard ${leaderboard.id}:`, error);
      return undefined;
    }
  }

  /**
   * Searches for leaderboard IDs by name.
   *
   * @param search the search query
   * @returns the leaderboard IDs that match the search query
   */
  public static async searchLeaderboardIds(search?: string): Promise<number[] | null> {
    if (!search || search.length < 3) {
      return [];
    }
    const matchingLeaderboards = await ScoreSaberLeaderboardModel.find({
      $or: [
        { songName: { $regex: search, $options: "i" } },
        { songSubName: { $regex: search, $options: "i" } },
        { songAuthorName: { $regex: search, $options: "i" } },
        { levelAuthorName: { $regex: search, $options: "i" } },
      ],
    })
      .select("_id")
      .lean();

    if (!matchingLeaderboards.length) {
      return null;
    }
    return matchingLeaderboards.map(lb => lb._id);
  }

  /**
   * Gets all the ranked leaderboards
   */
  public static async getRankedLeaderboards(): Promise<ScoreSaberLeaderboard[]> {
    return CacheService.fetchWithCache(
      CacheId.Leaderboards,
      "leaderboard:ranked-leaderboards",
      async () => {
        const leaderboards = await ScoreSaberLeaderboardModel.find({ ranked: true }).lean();
        return leaderboards.map(leaderboard => leaderboardToObject(leaderboard));
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
        return leaderboards.map(leaderboard => leaderboardToObject(leaderboard));
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
        const rankingQueueTokens = await ScoreSaberApiService.lookupRankingRequests();
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
   * Batch fetches leaderboards for items and returns a Map for O(1) lookups.
   *
   * @param items - Array of items that have a leaderboardId property
   * @param getId - Function to extract the leaderboard ID from an item
   * @param options - Options to pass to getLeaderboards
   * @returns A Map keyed by leaderboard ID to LeaderboardResponse
   */
  public static async batchFetchLeaderboards<T>(
    items: T[],
    getId: (item: T) => number,
    options?: LeaderboardOptions
  ): Promise<Map<number, LeaderboardResponse>> {
    if (items.length === 0) {
      return new Map();
    }

    const leaderboardIds = items.map(getId);
    const leaderboardResponses = await LeaderboardCoreService.getLeaderboards(
      leaderboardIds,
      options
    );

    return new Map(leaderboardResponses.map(response => [response.leaderboard.id, response]));
  }
}
