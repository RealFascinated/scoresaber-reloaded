import { CooldownPriority } from "@ssr/common/cooldown";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger from "@ssr/common/logger";
import { StorageBucket } from "@ssr/common/minio-buckets";
import { MapCharacteristicSchema } from "@ssr/common/schemas/map/map-characteristic";
import { MapDifficulty, MapDifficultySchema } from "@ssr/common/schemas/map/map-difficulty";
import { ScoreSaberLeaderboardDifficulty } from "@ssr/common/schemas/scoresaber/leaderboard/difficulty";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { getScoreSaberLeaderboardFromToken } from "@ssr/common/token-creators";
import { MapCharacteristic } from "@ssr/common/types/map-characteristic";
import ScoreSaberLeaderboardToken from "@ssr/common/types/token/scoresaber/leaderboard";
import Request from "@ssr/common/utils/request";
import { getScoreSaberDifficultyFromDifficulty } from "@ssr/common/utils/scoresaber.util";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../db";
import { leaderboardRowToType } from "../../db/converter/scoresaber-leaderboard";
import { scoreSaberLeaderboardsTable } from "../../db/schema";
import { LeaderboardScoreSeedQueue } from "../../queue/impl/leaderboard-score-seed-queue";
import { QueueId, QueueManager } from "../../queue/queue-manager";
import CacheService, { CacheId } from "../cache.service";
import { ScoreSaberApiService } from "../scoresaber-api.service";
import StorageService from "../storage.service";

export class LeaderboardCoreService {
  /**
   * Updates a leaderboard in the database.
   *
   * @param leaderboardId the ID of the leaderboard to update
   * @param leaderboard the leaderboard to update
   */
  public static async updateLeaderboard(
    leaderboardId: number,
    leaderboard: Partial<ScoreSaberLeaderboard>
  ): Promise<void> {
    // // Merge the existing leaderboard updates with the new leaderboard updates
    // if (LeaderboardCoreService.pendingLeaderboardUpdates.has(leaderboardId)) {
    //   const existingLeaderboard = LeaderboardCoreService.pendingLeaderboardUpdates.get(leaderboardId);
    //   if (existingLeaderboard) {
    //     LeaderboardCoreService.pendingLeaderboardUpdates.set(leaderboardId, {
    //       ...existingLeaderboard,
    //       ...leaderboard,
    //     });
    //   }
    // } else {
    //   // Set the new leaderboard updates
    //   LeaderboardCoreService.pendingLeaderboardUpdates.set(leaderboardId, leaderboard);
    // }
  }

  /**
   * Gets a ScoreSaber leaderboard by ID.
   *
   * @param id the ID of the leaderboard to get
   * @param options the options to use for the fetch
   * @returns the fetched leaderboard
   */
  public static async getLeaderboard(id: number): Promise<ScoreSaberLeaderboard> {
    return await CacheService.fetch(CacheId.Leaderboards, `leaderboard:id:${id}`, async () => {
      const mainAlias = alias(scoreSaberLeaderboardsTable, "main");
      const difficultiesAlias = alias(scoreSaberLeaderboardsTable, "difficulties");

      const result = await db
        .select()
        .from(mainAlias)
        .leftJoin(difficultiesAlias, eq(mainAlias.songHash, difficultiesAlias.songHash))
        .where(eq(mainAlias.id, id));

      if (!result.length) {
        return await LeaderboardCoreService.createLeaderboard(id);
      }

      const difficulties = result
        .map(r => r.difficulties)
        .filter(Boolean)
        .map(d => ({
          id: d!.id,
          difficulty: MapDifficultySchema.parse(d!.difficulty),
          characteristic: MapCharacteristicSchema.parse(d!.characteristic),
        }));

      return leaderboardRowToType(result[0].main, difficulties);
    });
  }

  /**
   * Checks if a leaderboard exists.
   *
   * @param id the ID of the leaderboard to check
   * @returns whether the leaderboard exists
   */
  public static async leaderboardExists(id: number): Promise<boolean> {
    return (
      (
        await db
          .select()
          .from(scoreSaberLeaderboardsTable)
          .where(eq(scoreSaberLeaderboardsTable.id, id))
          .limit(1)
      ).length > 0
    );
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
  ): Promise<ScoreSaberLeaderboard> {
    const before = performance.now();
    const leaderboardToken = token ?? (await ScoreSaberApiService.lookupLeaderboard(id));
    if (leaderboardToken == undefined) {
      throw new NotFoundError(`Leaderboard not found for "${id}"`);
    }
    const leaderboard = getScoreSaberLeaderboardFromToken(leaderboardToken);

    await LeaderboardCoreService.saveLeaderboard(id, leaderboard);
    (QueueManager.getQueue(QueueId.LeaderboardScoreSeedQueue) as LeaderboardScoreSeedQueue).add({
      id: leaderboard.id.toString(),
      data: leaderboard.id,
    });

    Logger.info(`Created leaderboard "${id}" in ${formatDuration(performance.now() - before)}`);
    return leaderboard;
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
    characteristic: MapCharacteristic
  ): Promise<ScoreSaberLeaderboard> {
    return await CacheService.fetch(
      CacheId.Leaderboards,
      `leaderboard:hash:${hash}:${difficulty}:${characteristic}`,
      async () => {
        const before = performance.now();
        const leaderboardToken = await ScoreSaberApiService.lookupLeaderboardByHash(
          hash,
          getScoreSaberDifficultyFromDifficulty(difficulty),
          characteristic
        );
        if (leaderboardToken == undefined) {
          throw new NotFoundError(
            `Leaderboard not found for hash "${hash}", difficulty "${difficulty}", characteristic "${characteristic}"`
          );
        }
        const leaderboard = getScoreSaberLeaderboardFromToken(leaderboardToken);

        await LeaderboardCoreService.saveLeaderboard(leaderboard.id, leaderboard);
        (QueueManager.getQueue(QueueId.LeaderboardScoreSeedQueue) as LeaderboardScoreSeedQueue).add({
          id: leaderboard.id.toString(),
          data: leaderboard.id,
        });

        Logger.info(
          `Created leaderboard "${leaderboard.id}" in ${formatDuration(performance.now() - before)}`
        );
        return leaderboard;
      }
    );
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
    leaderboardDifficulties: Map<string, ScoreSaberLeaderboardDifficulty[]>;
  }> {
    const leaderboards: ScoreSaberLeaderboard[] = [];
    const leaderboardDifficulties: Map<string, ScoreSaberLeaderboardDifficulty[]> = new Map();

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
        difficulties.push({
          id: leaderboard.id,
          difficulty: leaderboard.difficulty.difficulty,
          characteristic: leaderboard.difficulty.characteristic,
        });
        leaderboardDifficulties.set(leaderboard.songHash, difficulties);
      }

      if (logProgress && (page % 10 === 0 || page === 1 || page >= totalPages)) {
        Logger.info(`Fetched ${response.leaderboards.length} leaderboards on page ${page}/${totalPages}.`);
      }

      page++;
      hasMorePages = page < totalPages;
    }

    return { leaderboards, leaderboardDifficulties };
  }

  /**
   * Saves a leaderboard to the database.
   *
   * @param id the ID of the leaderboard to save
   * @param leaderboard the leaderboard to save
   * @returns the saved leaderboard
   */
  public static async saveLeaderboard(id: number, leaderboard: ScoreSaberLeaderboard) {
    await db.insert(scoreSaberLeaderboardsTable).values({
      id: id,
      songHash: leaderboard.songHash,
      songName: leaderboard.songName,
      songSubName: leaderboard.songSubName,
      songAuthorName: leaderboard.songAuthorName,
      levelAuthorName: leaderboard.levelAuthorName,
      difficulty: leaderboard.difficulty.difficulty,
      characteristic: leaderboard.difficulty.characteristic,
      maxScore: leaderboard.maxScore,
      ranked: leaderboard.ranked,
      qualified: leaderboard.qualified,
      stars: leaderboard.stars,
      rankedDate: leaderboard.rankedDate,
      qualifiedDate: leaderboard.qualifiedDate,
      plays: leaderboard.plays,
      dailyPlays: leaderboard.dailyPlays,
      seededScores: false,
      cachedSongArt: false,
      timestamp: leaderboard.timestamp,
    });
  }

  /**
   * Searches for leaderboard IDs by name.
   *
   * @param search the search query
   * @param limit the limit of the search
   * @returns the leaderboard IDs that match the search query
   */
  public static async searchLeaderboardIds(search: string, limit: number = 50): Promise<number[]> {
    if (search.length < 3) {
      return [];
    }

    const result = await db
      .select({ id: scoreSaberLeaderboardsTable.id })
      .from(scoreSaberLeaderboardsTable)
      .where(
        sql`to_tsvector('english', ${scoreSaberLeaderboardsTable.songName} || ' ' || ${scoreSaberLeaderboardsTable.songSubName} || ' ' || ${scoreSaberLeaderboardsTable.songAuthorName} || ' ' || ${scoreSaberLeaderboardsTable.levelAuthorName}) @@ plainto_tsquery('english', ${search})`
      )
      .orderBy(
        sql`ts_rank(to_tsvector('english', ${scoreSaberLeaderboardsTable.songName} || ' ' || ${scoreSaberLeaderboardsTable.songSubName} || ' ' || ${scoreSaberLeaderboardsTable.songAuthorName} || ' ' || ${scoreSaberLeaderboardsTable.levelAuthorName}), plainto_tsquery('english', ${search})) DESC`
      )
      .limit(limit);

    return result.map(r => r.id);
  }

  /**
   * Gets all the ranked leaderboards
   */
  public static async getRankedLeaderboards(): Promise<ScoreSaberLeaderboard[]> {
    return CacheService.fetch(CacheId.Leaderboards, "leaderboard:ranked-leaderboards", async () => {
      const result = await db
        .select()
        .from(scoreSaberLeaderboardsTable)
        .where(eq(scoreSaberLeaderboardsTable.ranked, true));
      return result.map(leaderboard => leaderboardRowToType(leaderboard));
    });
  }

  /**
   * Gets all the qualified leaderboards
   */
  public static async getQualifiedLeaderboards(): Promise<ScoreSaberLeaderboard[]> {
    return CacheService.fetch(CacheId.Leaderboards, "leaderboard:qualified-leaderboards", async () => {
      const result = await db
        .select()
        .from(scoreSaberLeaderboardsTable)
        .where(eq(scoreSaberLeaderboardsTable.qualified, true));
      return result.map(leaderboard => leaderboardRowToType(leaderboard));
    });
  }

  /**
   * Gets the ranking queue leaderboards
   */
  public static async getRankingQueueLeaderboards(): Promise<ScoreSaberLeaderboard[]> {
    return CacheService.fetch(CacheId.Leaderboards, "leaderboard:ranking-queue-maps", async () => {
      const rankingQueueTokens = await ScoreSaberApiService.lookupRankingRequests();
      if (!rankingQueueTokens) {
        return [];
      }

      return rankingQueueTokens.all.map(token => getScoreSaberLeaderboardFromToken(token.leaderboardInfo));
    });
  }

  /**
   * Caches the song art for a leaderboard.
   *
   * @param leaderboard the leaderboard to cache the song art for
   */
  public static async cacheLeaderboardSongArt(leaderboard: ScoreSaberLeaderboard): Promise<void> {
    const exists = await StorageService.fileExists(
      StorageBucket.LeaderboardSongArt,
      `${leaderboard.songHash}.png`
    );
    if (!exists) {
      const request = await Request.get<ArrayBuffer>(
        `https://cdn.scoresaber.com/covers/${leaderboard.songHash}.png`,
        {
          returns: "arraybuffer",
        }
      );
      if (request) {
        await StorageService.saveFile(
          StorageBucket.LeaderboardSongArt,
          `${leaderboard.songHash}.png`,
          Buffer.from(request)
        );

        await db
          .update(scoreSaberLeaderboardsTable)
          .set({ cachedSongArt: true })
          .where(eq(scoreSaberLeaderboardsTable.id, leaderboard.id));

        Logger.info(`Cached song art for leaderboard ${leaderboard.id}: ${leaderboard.songHash}`);
        return;
      }

      Logger.warn(`Failed to cache song art for leaderboard ${leaderboard.id}: ${leaderboard.songHash}`);
    }
  }
}
