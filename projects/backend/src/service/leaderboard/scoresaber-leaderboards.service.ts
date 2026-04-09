import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger, { type ScopedLogger } from "@ssr/common/logger";
import { StorageBucket } from "@ssr/common/minio-buckets";
import { Pagination } from "@ssr/common/pagination";
import { LeaderboardStarChange } from "@ssr/common/schemas/leaderboard/leaderboard-star-change";
import { MapCharacteristic } from "@ssr/common/schemas/map/map-characteristic";
import { MapDifficulty } from "@ssr/common/schemas/map/map-difficulty";
import type { LeaderboardsPageResponse } from "@ssr/common/schemas/response/leaderboard/leaderboards-page";
import {
  RankingQueueLeaderboard,
  RankingQueueLeaderboardsResponse,
} from "@ssr/common/schemas/response/leaderboard/ranking-queue-leaderboards";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import type { ScoreSaberLeaderboardQueryFilters } from "@ssr/common/schemas/scoresaber/leaderboard/query-filters";
import { getScoreSaberLeaderboardFromToken } from "@ssr/common/token-creators";
import ScoreSaberLeaderboardToken from "@ssr/common/types/token/scoresaber/leaderboard";
import RankingRequestToken from "@ssr/common/types/token/scoresaber/ranking-request-token";
import Request from "@ssr/common/utils/request";
import { getScoreSaberDifficultyFromDifficulty } from "@ssr/common/utils/scoresaber.util";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { count } from "drizzle-orm";
import { normalizeSongHash, rankingQueueLeaderboardsCacheKey } from "../../common/cache-keys";
import { db } from "../../db";
import { leaderboardRowToType } from "../../db/converter/scoresaber-leaderboard";
import { scoreSaberLeaderboardsTable } from "../../db/schema";
import { LeaderboardScoreSeedQueue } from "../../queue/impl/leaderboard-score-seed-queue";
import { QueueId, QueueManager } from "../../queue/queue-manager";
import { ScoreSaberLeaderboardStarChangeRepository } from "../../repositories/scoresaber-leaderboard-star-change.repository";
import {
  LEADERBOARD_SEARCH_PAGE_SIZE,
  ScoreSaberLeaderboardsRepository,
  buildLeaderboardQuery,
} from "../../repositories/scoresaber-leaderboards.repository";
import { ScoreSaberApiService } from "../external/scoresaber-api.service";
import CacheService, { CacheId } from "../infra/cache.service";
import StorageService from "../infra/storage.service";

export class ScoreSaberLeaderboardsService {
  private static readonly logger: ScopedLogger = Logger.withTopic("ScoreSaber Leaderboards");

  /**
   * Gets a leaderboard by its ID.
   *
   * @param id the ID of the leaderboard to get
   * @returns the leaderboard
   */
  public static async getLeaderboard(id: number): Promise<ScoreSaberLeaderboard> {
    const leaderboard = await ScoreSaberLeaderboardsRepository.getLeaderboardById(id);
    if (leaderboard !== undefined) {
      return leaderboard;
    }
    return await ScoreSaberLeaderboardsService.createLeaderboard(id);
  }

  /**
   * Gets a leaderboard by its hash, difficulty, and characteristic.
   *
   * @param hash the hash of the leaderboard to get
   * @param difficulty the difficulty of the leaderboard to get
   * @param characteristic the characteristic of the leaderboard to get
   * @returns the leaderboard
   */
  public static async getLeaderboardByHash(
    hash: string,
    difficulty: MapDifficulty,
    characteristic: MapCharacteristic
  ): Promise<ScoreSaberLeaderboard> {
    const hashNorm = normalizeSongHash(hash);
    const leaderboard = await ScoreSaberLeaderboardsRepository.getLeaderboardByHash(
      hashNorm,
      difficulty,
      characteristic
    );

    if (leaderboard !== undefined) {
      return leaderboard;
    }

    const before = performance.now();
    const leaderboardToken = await ScoreSaberApiService.lookupLeaderboardByHash(
      hashNorm,
      getScoreSaberDifficultyFromDifficulty(difficulty),
      characteristic
    );
    if (leaderboardToken == undefined) {
      throw new NotFoundError(
        `Leaderboard not found for hash "${hash}", difficulty "${difficulty}", characteristic "${characteristic}"`
      );
    }
    const foundLeaderboard = getScoreSaberLeaderboardFromToken(leaderboardToken);

    await ScoreSaberLeaderboardsService.saveLeaderboard(foundLeaderboard.id, foundLeaderboard);
    (QueueManager.getQueue(QueueId.LeaderboardScoreSeedQueue) as LeaderboardScoreSeedQueue).add({
      id: foundLeaderboard.id.toString(),
      data: foundLeaderboard.id,
    });

    ScoreSaberLeaderboardsService.logger.info(
      `Created leaderboard "${foundLeaderboard.id}" in ${formatDuration(performance.now() - before)}`
    );
    return foundLeaderboard;
  }

  /**
   * Gets a paginated list of leaderboards.
   *
   * @param page the page to get
   * @param filters the filters to apply
   * @returns the paginated list of leaderboards
   */
  public static async getLeaderboardsPaginated(
    page: number,
    filters?: ScoreSaberLeaderboardQueryFilters
  ): Promise<LeaderboardsPageResponse> {
    const { whereClause, orderParts } = buildLeaderboardQuery(filters);

    const [countRow] = await db
      .select({ total: count() })
      .from(scoreSaberLeaderboardsTable)
      .where(whereClause);
    const total = Number(countRow?.total ?? 0);

    const pagination = new Pagination<ScoreSaberLeaderboard>()
      .setItemsPerPage(LEADERBOARD_SEARCH_PAGE_SIZE)
      .setTotalItems(total);

    return await pagination.getPage(page, async fetchItems => {
      const rows = await db
        .select()
        .from(scoreSaberLeaderboardsTable)
        .where(whereClause)
        .orderBy(...orderParts)
        .limit(fetchItems.end - fetchItems.start)
        .offset(fetchItems.start);

      return rows.map(row => leaderboardRowToType(row));
    });
  }

  /**
   * Creates a leaderboard.
   *
   * @param id the ID of the leaderboard to create
   * @param token the token of the leaderboard to create
   * @param options the options to create the leaderboard
   * @returns the created leaderboard
   */
  public static async createLeaderboard(
    id: number,
    token?: ScoreSaberLeaderboardToken,
    options?: { skipScoreSeedQueue?: boolean }
  ): Promise<ScoreSaberLeaderboard> {
    const before = performance.now();
    const leaderboardToken = token ?? (await ScoreSaberApiService.lookupLeaderboard(id));
    if (leaderboardToken == undefined) {
      throw new NotFoundError(`Leaderboard not found for "${id}"`);
    }
    const leaderboard = getScoreSaberLeaderboardFromToken(leaderboardToken);

    await ScoreSaberLeaderboardsService.saveLeaderboard(id, leaderboard);
    if (!options?.skipScoreSeedQueue) {
      (QueueManager.getQueue(QueueId.LeaderboardScoreSeedQueue) as LeaderboardScoreSeedQueue).add({
        id: leaderboard.id.toString(),
        data: leaderboard.id,
      });
    }

    ScoreSaberLeaderboardsService.logger.info(
      `Created leaderboard "${id}" in ${formatDuration(performance.now() - before)}`
    );
    return leaderboard;
  }

  /**
   * Fetches the star change history for a given leaderboard.
   *
   * @param leaderboard the leaderboard to fetch the star change history for
   * @returns the star change history
   */
  public static async getStarChangeHistory(
    leaderboard: ScoreSaberLeaderboard
  ): Promise<LeaderboardStarChange[]> {
    const rows = await ScoreSaberLeaderboardStarChangeRepository.listByLeaderboardIdOrderedByTimestampDesc(
      leaderboard.id
    );

    return rows.map(starChange => ({
      previousStars: starChange.previousStars,
      newStars: starChange.newStars,
      timestamp: starChange.timestamp,
    }));
  }

  /**
   * Saves a leaderboard to the database and caches the song art.
   *
   * @param id the ID of the leaderboard to save
   * @param leaderboard the leaderboard to save
   */
  public static async saveLeaderboard(id: number, leaderboard: ScoreSaberLeaderboard) {
    const cachedSongArt = await ScoreSaberLeaderboardsService.cacheLeaderboardSongArt(leaderboard);
    await ScoreSaberLeaderboardsRepository.insert(id, leaderboard, cachedSongArt);
  }

  /**
   * Fetches the ranking queue leaderboards from the ScoreSaber API.
   *
   * @returns the ranking queue leaderboards
   */
  public static async getRankingQueueLeaderboards(): Promise<RankingQueueLeaderboardsResponse> {
    return CacheService.fetch(
      CacheId.SCORESABER_RANKING_QUEUE_LEADERBOARDS,
      rankingQueueLeaderboardsCacheKey,
      async () => {
        const rankingQueueTokens = await ScoreSaberApiService.lookupRankingRequests();
        if (!rankingQueueTokens) {
          return {
            nextInQueue: [],
            openRankUnrank: [],
            all: [],
          };
        }

        function parseLeaderboard(token: RankingRequestToken): RankingQueueLeaderboard {
          const leaderboard = getScoreSaberLeaderboardFromToken(token.leaderboardInfo);
          return {
            ...leaderboard,
            difficultyCount: token.difficultyCount,
          };
        }

        return {
          nextInQueue: rankingQueueTokens.nextInQueue.map(parseLeaderboard),
          openRankUnrank: rankingQueueTokens.openRankUnrank.map(parseLeaderboard),
          all: rankingQueueTokens.all.map(parseLeaderboard),
        };
      }
    );
  }

  /**
   * Caches the song art for a leaderboard.
   *
   * @param leaderboard the leaderboard to cache the song art for
   * @returns whether the song art was cached successfully
   */
  public static async cacheLeaderboardSongArt(leaderboard: ScoreSaberLeaderboard): Promise<boolean> {
    const objectKey = `${leaderboard.songHash}.png`;

    const exists = await StorageService.fileExists(StorageBucket.LeaderboardSongArt, objectKey);
    if (exists) {
      await ScoreSaberLeaderboardsRepository.updateLeaderboard(leaderboard.id, {
        cachedSongArt: true,
      });
      return true;
    }

    const request = await Request.get<ArrayBuffer>(
      `https://cdn.scoresaber.com/covers/${leaderboard.songHash}.png`,
      {
        returns: "arraybuffer",
      }
    );
    if (request) {
      await StorageService.saveFile(StorageBucket.LeaderboardSongArt, objectKey, Buffer.from(request));
      await ScoreSaberLeaderboardsRepository.updateLeaderboard(leaderboard.id, {
        cachedSongArt: true,
      });

      ScoreSaberLeaderboardsService.logger.info(
        `Cached song art for leaderboard ${leaderboard.id}: ${leaderboard.songHash}`
      );
      return true;
    }

    ScoreSaberLeaderboardsService.logger.warn(
      `Failed to cache song art for leaderboard ${leaderboard.id}: ${leaderboard.songHash}`
    );
    return false;
  }
}
