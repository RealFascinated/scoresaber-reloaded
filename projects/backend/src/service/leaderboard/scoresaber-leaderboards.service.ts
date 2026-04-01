import { CooldownPriority } from "@ssr/common/cooldown";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger, { type ScopedLogger } from "@ssr/common/logger";
import { StarFilter } from "@ssr/common/maps/types";
import { StorageBucket } from "@ssr/common/minio-buckets";
import type { Page } from "@ssr/common/pagination";
import { MapCharacteristic } from "@ssr/common/schemas/map/map-characteristic";
import { MapDifficulty } from "@ssr/common/schemas/map/map-difficulty";
import { ScoreSaberLeaderboardDifficulty } from "@ssr/common/schemas/scoresaber/leaderboard/difficulty";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { getScoreSaberLeaderboardFromToken } from "@ssr/common/token-creators";
import ScoreSaberLeaderboardToken from "@ssr/common/types/token/scoresaber/leaderboard";
import Request from "@ssr/common/utils/request";
import { getScoreSaberDifficultyFromDifficulty } from "@ssr/common/utils/scoresaber.util";
import { formatDuration } from "@ssr/common/utils/time-utils";
import {
  leaderboardByHashCacheKey,
  leaderboardByIdCacheKey,
  normalizeSongHash,
  qualifiedLeaderboardsCacheKey,
  rankedLeaderboardsCacheKey,
  rankingQueueLeaderboardsCacheKey,
} from "../../common/cache-keys";
import { LeaderboardScoreSeedQueue } from "../../queue/impl/leaderboard-score-seed-queue";
import { QueueId, QueueManager } from "../../queue/queue-manager";
import { ScoreSaberLeaderboardsRepository } from "../../repositories/scoresaber-leaderboards.repository";
import { ScoreSaberApiService } from "../external/scoresaber-api.service";
import CacheService, { CacheId } from "../infra/cache.service";
import StorageService from "../infra/storage.service";

export class ScoreSaberLeaderboardsService {
  private static readonly logger: ScopedLogger = Logger.withTopic("ScoreSaber Leaderboards");

  public static async getLeaderboard(id: number): Promise<ScoreSaberLeaderboard> {
    return await CacheService.fetch(
      CacheId.SCORESABER_LEADERBOARDS,
      leaderboardByIdCacheKey(id),
      async () => {
        const map = await ScoreSaberLeaderboardsService.getLeaderboardsWithDifficultiesByIds([id]);
        const leaderboard = map.get(id);
        if (!leaderboard) {
          return await ScoreSaberLeaderboardsService.createLeaderboard(id);
        }
        return leaderboard;
      }
    );
  }

  public static async getLeaderboardByHash(
    hash: string,
    difficulty: MapDifficulty,
    characteristic: MapCharacteristic
  ): Promise<ScoreSaberLeaderboard> {
    const hashNorm = normalizeSongHash(hash);
    return await CacheService.fetch(
      CacheId.SCORESABER_LEADERBOARDS,
      leaderboardByHashCacheKey(hashNorm, difficulty, characteristic),
      async () => {
        const matchId = await ScoreSaberLeaderboardsRepository.findIdBySongHashDifficultyCharacteristic(
          hashNorm,
          difficulty,
          characteristic
        );

        if (matchId !== undefined) {
          const map = await ScoreSaberLeaderboardsService.getLeaderboardsWithDifficultiesByIds([matchId]);
          const fromDb = map.get(matchId);
          if (fromDb) {
            return fromDb;
          }
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
        const leaderboard = getScoreSaberLeaderboardFromToken(leaderboardToken);

        await ScoreSaberLeaderboardsService.saveLeaderboard(leaderboard.id, leaderboard);
        (QueueManager.getQueue(QueueId.LeaderboardScoreSeedQueue) as LeaderboardScoreSeedQueue).add({
          id: leaderboard.id.toString(),
          data: leaderboard.id,
        });

        ScoreSaberLeaderboardsService.logger.info(
          `Created leaderboard "${leaderboard.id}" in ${formatDuration(performance.now() - before)}`
        );
        return leaderboard;
      }
    );
  }

  public static async getLeaderboardsWithDifficultiesByIds(
    ids: number[]
  ): Promise<Map<number, ScoreSaberLeaderboard>> {
    const uniqueIds = [...new Set(ids)];
    const result = new Map<number, ScoreSaberLeaderboard>();
    const missingIds: number[] = [];

    for (const id of uniqueIds) {
      const leaderboard = await CacheService.get<ScoreSaberLeaderboard>(
        CacheId.SCORESABER_LEADERBOARDS,
        leaderboardByIdCacheKey(id)
      );
      if (leaderboard !== undefined) {
        result.set(id, leaderboard);
      } else {
        missingIds.push(id);
      }
    }

    if (missingIds.length > 0) {
      const dbLeaderboards =
        await ScoreSaberLeaderboardsRepository.getLeaderboardsWithDifficultiesByIds(missingIds);
      for (const [id, leaderboard] of dbLeaderboards) {
        result.set(id, leaderboard);
        await CacheService.insert(CacheId.SCORESABER_LEADERBOARDS, leaderboardByIdCacheKey(id), leaderboard);
      }
    }

    return result;
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

  public static async saveLeaderboard(id: number, leaderboard: ScoreSaberLeaderboard) {
    const cachedSongArt = await ScoreSaberLeaderboardsService.cacheLeaderboardSongArt(leaderboard);
    await ScoreSaberLeaderboardsRepository.insert(id, leaderboard, cachedSongArt);
  }

  public static async lookupLeaderboards(
    page: number,
    options?: {
      ranked?: boolean;
      qualified?: boolean;
      category?: number;
      stars?: StarFilter;
      sort?: number;
      query?: string;
    }
  ): Promise<Page<ScoreSaberLeaderboard>> {
    return ScoreSaberLeaderboardsRepository.lookupLeaderboards(page, options);
  }

  public static async getRankedLeaderboards(): Promise<ScoreSaberLeaderboard[]> {
    return CacheService.fetch(CacheId.SCORESABER_LEADERBOARDS, rankedLeaderboardsCacheKey, async () => {
      return ScoreSaberLeaderboardsRepository.getRankedLeaderboards();
    });
  }

  public static async getQualifiedLeaderboards(): Promise<ScoreSaberLeaderboard[]> {
    return CacheService.fetch(CacheId.SCORESABER_LEADERBOARDS, qualifiedLeaderboardsCacheKey, async () => {
      return ScoreSaberLeaderboardsRepository.getQualifiedLeaderboards();
    });
  }

  public static async getRankingQueueLeaderboards(): Promise<ScoreSaberLeaderboard[]> {
    return CacheService.fetch(CacheId.SCORESABER_LEADERBOARDS, rankingQueueLeaderboardsCacheKey, async () => {
      const rankingQueueTokens = await ScoreSaberApiService.lookupRankingRequests();
      if (!rankingQueueTokens) {
        return [];
      }

      return rankingQueueTokens.all.map(token => getScoreSaberLeaderboardFromToken(token.leaderboardInfo));
    });
  }

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
