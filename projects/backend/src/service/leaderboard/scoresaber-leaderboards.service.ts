import { CooldownPriority } from "@ssr/common/cooldown";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger, { type ScopedLogger } from "@ssr/common/logger";
import { StorageBucket } from "@ssr/common/minio-buckets";
import { LeaderboardStarChange } from "@ssr/common/schemas/leaderboard/leaderboard-star-change";
import { MapCharacteristic } from "@ssr/common/schemas/map/map-characteristic";
import { MapDifficulty } from "@ssr/common/schemas/map/map-difficulty";
import { ScoreSaberLeaderboardDifficulty } from "@ssr/common/schemas/scoresaber/leaderboard/difficulty";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { getScoreSaberLeaderboardFromToken } from "@ssr/common/token-creators";
import ScoreSaberLeaderboardToken from "@ssr/common/types/token/scoresaber/leaderboard";
import Request from "@ssr/common/utils/request";
import { getScoreSaberDifficultyFromDifficulty } from "@ssr/common/utils/scoresaber.util";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { normalizeSongHash, rankingQueueLeaderboardsCacheKey } from "../../common/cache-keys";
import { LeaderboardScoreSeedQueue } from "../../queue/impl/leaderboard-score-seed-queue";
import { QueueId, QueueManager } from "../../queue/queue-manager";
import { ScoreSaberLeaderboardStarChangeRepository } from "../../repositories/scoresaber-leaderboard-star-change.repository";
import { ScoreSaberLeaderboardsRepository } from "../../repositories/scoresaber-leaderboards.repository";
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
  public static async fetchStarChangeHistory(
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
   * Fetches leaderboards from the ScoreSaber API.
   *
   * @param status the status of the leaderboards to fetch
   * @param logProgress whether to log progress
   * @returns the leaderboards
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

        const difficulties = leaderboardDifficulties.get(leaderboard.songHash) ?? [];
        difficulties.push({
          id: leaderboard.id,
          difficulty: leaderboard.difficulty.difficulty,
          characteristic: leaderboard.difficulty.characteristic,
        });
        leaderboardDifficulties.set(leaderboard.songHash, difficulties);
      }

      if (logProgress && (page % 10 === 0 || page === 1 || page >= totalPages)) {
        ScoreSaberLeaderboardsService.logger.info(
          `Fetched ${response.leaderboards.length} leaderboards on page ${page}/${totalPages}.`
        );
      }

      page++;
      hasMorePages = page < totalPages;
    }

    return { leaderboards, leaderboardDifficulties };
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
  public static async getRankingQueueLeaderboards(): Promise<ScoreSaberLeaderboard[]> {
    return CacheService.fetch(
      CacheId.SCORESABER_RANKING_QUEUE_LEADERBOARDS,
      rankingQueueLeaderboardsCacheKey,
      async () => {
        const rankingQueueTokens = await ScoreSaberApiService.lookupRankingRequests();
        if (!rankingQueueTokens) {
          return [];
        }

        return rankingQueueTokens.all.map(token => getScoreSaberLeaderboardFromToken(token.leaderboardInfo));
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
      await ScoreSaberLeaderboardsRepository.updateLeaderboardById(leaderboard.id, {
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
      await ScoreSaberLeaderboardsRepository.updateLeaderboardById(leaderboard.id, {
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
