import { env } from "@ssr/common/env";
import { InternalServerError } from "@ssr/common/error/internal-server-error";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import { HMD } from "@ssr/common/hmds";
import Logger, { type ScopedLogger } from "@ssr/common/logger";
import { getS3BucketName, StorageBucket } from "@ssr/common/minio-buckets";
import { PlayerRefreshResponse } from "@ssr/common/schemas/response/player/player-refresh";
import { ScoreSaberAccount } from "@ssr/common/schemas/scoresaber/account";
import { ScoreSaberPlayerScoreStats } from "@ssr/common/schemas/scoresaber/player/score-stats";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import Request from "@ssr/common/utils/request";
import { isProduction } from "@ssr/common/utils/utils";
import { playerCacheKey } from "../../common/cache-keys";
import { logNewTrackedPlayer } from "../../common/embds";
import { scoreSaberAccountRowToType } from "../../db/converter/scoresaber-account";
import { type ScoreSaberAccountRow } from "../../db/schema";
import { FetchMissingScoresQueue } from "../../queue/impl/player-scoresaber-scores-queue";
import { QueueId, QueueManager } from "../../queue/queue-manager";
import { ScoreSaberAccountsRepository } from "../../repositories/scoresaber-accounts.repository";
import { ScoreSaberScoresRepository } from "../../repositories/scoresaber-scores.repository";
import { ScoreSaberApiService } from "../external/scoresaber-api.service";
import CacheService from "../infra/cache.service";
import StorageService from "../infra/storage.service";

export const accountCreationLock: Record<string, Promise<ScoreSaberAccount | undefined>> = {};

export class PlayerCoreService {
  private static readonly logger: ScopedLogger = Logger.withTopic("Player Core");

  /**
   * Gets a player by id.
   *
   * @param id the player's id
   * @param playerToken an optional player token
   * @param options optional behavior (e.g. skip in-memory cache for bulk operations)
   * @returns the player document if found
   * @throws NotFoundError if the player doesn't exist on ScoreSaber
   */
  public static async getOrCreateAccount(
    id: string,
    playerToken?: ScoreSaberPlayerToken
  ): Promise<ScoreSaberAccount> {
    // Wait for the existing lock if it's in progress
    if (accountCreationLock[id] !== undefined) {
      const result = await accountCreationLock[id];
      if (result === undefined) {
        throw new NotFoundError(`Player "${id}" not found after creation`);
      }
      return result;
    }

    let account = await ScoreSaberAccountsRepository.findRowById(id);

    if (!account) {
      const created = await PlayerCoreService.createPlayer(id, playerToken);
      if (!created) {
        throw new NotFoundError(`Player "${id}" not found after creation`);
      }
      account = await ScoreSaberAccountsRepository.findRowById(id);
      if (!account) {
        throw new NotFoundError(`Player "${id}" not found after creation`);
      }
    }

    const isOculusAccount =
      playerToken?.id.length === 16 ||
      playerToken?.profilePicture === "https://cdn.scoresaber.com/avatars/oculus.png";
    let avatar = playerToken?.profilePicture ?? "https://cdn.fascinated.cc/assets/unknown.png";
    if (isOculusAccount) {
      avatar = "https://cdn.fascinated.cc/assets/oculus-avatar.jpg";
    } else if (playerToken?.profilePicture === "https://cdn.scoresaber.com/avatars/steam.png") {
      avatar = "https://cdn.fascinated.cc/assets/unknown.png";
    } else if (account) {
      avatar = `${env.NEXT_PUBLIC_CDN_URL}/${getS3BucketName(StorageBucket.PlayerAvatars)}/${id}.jpg`;
    }

    if (
      account &&
      !isOculusAccount &&
      !account.cachedProfilePicture &&
      playerToken?.profilePicture !== "https://cdn.scoresaber.com/avatars/steam.png"
    ) {
      await PlayerCoreService.cachePlayerProfilePicture(id);
    }

    let shouldSave = false;
    const updates: Partial<Pick<ScoreSaberAccountRow, "country" | "banned" | "avatar">> = {};
    if (playerToken?.country !== account.country) {
      updates.country = playerToken?.country ?? null;
      shouldSave = true;
    }
    if (playerToken?.banned !== account.banned) {
      updates.banned = playerToken?.banned ?? false;
      shouldSave = true;
    }
    if (account.avatar !== avatar) {
      updates.avatar = avatar;
      shouldSave = true;
    }

    if (shouldSave) {
      await PlayerCoreService.updatePlayer(id, updates);
      Object.assign(account, updates);
    }

    return scoreSaberAccountRowToType(account);
  }

  /**
   * Gets a player by id.
   *
   * @param id the player's id
   * @returns the player document if found
   */
  public static async getAccount(id: string): Promise<ScoreSaberAccount | undefined> {
    const account = await ScoreSaberAccountsRepository.findRowById(id);
    return account ? scoreSaberAccountRowToType(account) : undefined;
  }

  /**
   * Creates a player if they are not already tracked.
   *
   * @param id the player's id
   * @param playerToken an optional player token
   * @returns the player if successfully tracked, undefined otherwise
   */
  public static async createPlayer(
    id: string,
    playerToken?: ScoreSaberPlayerToken
  ): Promise<ScoreSaberAccount | undefined> {
    let lockPromise = accountCreationLock[id];
    if (lockPromise === undefined) {
      lockPromise = (async (): Promise<ScoreSaberAccount | undefined> => {
        try {
          const existingRow = await ScoreSaberAccountsRepository.findRowById(id);
          if (existingRow) {
            return scoreSaberAccountRowToType(existingRow);
          }

          const token = playerToken || (await ScoreSaberApiService.lookupPlayer(id));
          if (!token) {
            return undefined;
          }

          try {
            PlayerCoreService.logger.info(`Creating player "${id}"...`);

            const playerInsert: ScoreSaberAccountRow = {
              id: id,
              name: token.name,
              country: token.country,
              avatar: "https://cdn.fascinated.cc/assets/unknown.png",
              peakRank: token.rank,
              peakRankTimestamp: new Date(),
              seededScores: false,
              seededBeatLeaderScores: false,
              cachedProfilePicture: false,
              trackReplays: false,
              inactive: token.inactive,
              banned: token.banned,
              pp: token.pp,
              medals: 0,
              medalsRank: 0,
              medalsCountryRank: 0,
              hmd: "Unknown" as HMD,
              scoreStats: {
                aPlays: 0,
                sPlays: 0,
                spPlays: 0,
                ssPlays: 0,
                sspPlays: 0,
                godPlays: 0,
              },
              currentStreak: 0,
              longestStreak: 0,
              lastPlayedDate: null,
              trackedSince: new Date(),
              joinedDate: new Date(token.firstSeen),
            };
            await ScoreSaberAccountsRepository.insert(playerInsert);

            // If the player has less scores tracked than the total play count, add them to the refresh queue
            const trackedScores = await ScoreSaberScoresRepository.countByPlayerId(id);
            if (trackedScores < token.scoreStats.totalPlayCount) {
              const seedQueue = QueueManager.getQueue(
                QueueId.PlayerScoreRefreshQueue
              ) as FetchMissingScoresQueue;
              if (!(await seedQueue.hasItem({ id: id, data: id })) && !token.banned) {
                (QueueManager.getQueue(QueueId.PlayerScoreRefreshQueue) as FetchMissingScoresQueue).add({
                  id,
                  data: id,
                });
              }
            } else {
              // Mark player as seeded
              await ScoreSaberAccountsRepository.updateAccount(id, { seededScores: true });
            }

            if (isProduction()) {
              await logNewTrackedPlayer(token);
            }
            return scoreSaberAccountRowToType(playerInsert);
          } catch (err) {
            PlayerCoreService.logger.error(`Failed to create player document for "${id}"`, err);
            throw new InternalServerError(`Failed to create player document for "${id}"`);
          } finally {
            delete accountCreationLock[id];
          }
        } catch (err) {
          if (err instanceof InternalServerError) {
            throw err;
          }
          PlayerCoreService.logger.error(`Failed to create player document for "${id}"`, err);
          return undefined;
        } finally {
          delete accountCreationLock[id];
        }
      })();
      accountCreationLock[id] = lockPromise;
    }
    return lockPromise;
  }

  public static async createIfMissing(id: string): Promise<void> {
    if (await PlayerCoreService.playerExists(id)) {
      return;
    }
    await PlayerCoreService.createPlayer(id);
  }

  /**
   * Checks if a player exists.
   *
   * @param id the player's id
   * @returns whether the player exists
   */
  public static async playerExists(id: string, throwIfNotFound: boolean = false): Promise<boolean> {
    const exists = await ScoreSaberAccountsRepository.existsById(id);
    if (throwIfNotFound && !exists) {
      throw new NotFoundError(`Player "${id}" not found`);
    }
    return exists;
  }

  /**
   * Refreshes a player.
   *
   * @param id the player's id
   * @returns the player document if found
   */
  public static async refreshPlayer(id: string): Promise<PlayerRefreshResponse> {
    const response = await ScoreSaberApiService.refreshPlayer(id);
    if (response !== undefined) {
      await Promise.all([
        CacheService.invalidate(playerCacheKey(id, "basic")),
        CacheService.invalidate(playerCacheKey(id, "full")),
      ]);

      const isOculusAccount = id.length === 16;
      if (!isOculusAccount) {
        await PlayerCoreService.cachePlayerProfilePicture(id, true);
      }
      return response;
    }
    return { result: false };
  }

  /**
   * Updates a player.
   *
   * @param playerId the player's id
   * @param patch the patch to apply
   * @param options optional behavior (e.g. invalidate cache)
   * @returns the updated player
   */
  public static async updatePlayer(
    playerId: string,
    patch: Partial<Omit<ScoreSaberAccountRow, "id">>,
    options?: { invalidateCache?: boolean }
  ): Promise<void> {
    if (Object.keys(patch).length === 0) {
      return;
    }

    await ScoreSaberAccountsRepository.updateAccount(playerId, patch);

    if (options?.invalidateCache !== false) {
      await Promise.all([
        CacheService.invalidate(playerCacheKey(playerId, "basic")),
        CacheService.invalidate(playerCacheKey(playerId, "full")),
      ]);
    }
  }

  /**
   * Updates the player's peak rank.
   *
   * @param playerToken the player's token
   */
  public static async updatePeakRank(playerToken: ScoreSaberPlayerToken) {
    const account = await ScoreSaberAccountsRepository.findRowById(playerToken.id);
    if (!account) {
      return;
    }
    if (account.peakRank === playerToken.rank) {
      return;
    }
    if (playerToken.rank == 0) {
      return;
    }

    if (!account.peakRank || (account.peakRank && playerToken.rank < account.peakRank)) {
      await ScoreSaberAccountsRepository.updateAccount(playerToken.id, {
        peakRank: playerToken.rank,
        peakRankTimestamp: new Date(),
      });
    }

    return scoreSaberAccountRowToType(account);
  }

  /**
   * Caches the profile picture for a player.
   *
   * @param playerId the player's id
   * @param force when true, re-downloads even if already cached
   */
  public static async cachePlayerProfilePicture(playerId: string, force = false): Promise<void> {
    const exists = await StorageService.fileExists(StorageBucket.PlayerAvatars, `${playerId}.jpg`);
    if (!exists || force) {
      const request = await Request.get<ArrayBuffer>(`https://cdn.scoresaber.com/avatars/${playerId}.jpg`, {
        returns: "arraybuffer",
      });
      if (request) {
        await StorageService.saveFile(StorageBucket.PlayerAvatars, `${playerId}.jpg`, Buffer.from(request));
        await ScoreSaberAccountsRepository.updateAccount(playerId, { cachedProfilePicture: true });
        await Promise.all([
          CacheService.invalidate(playerCacheKey(playerId, "basic")),
          CacheService.invalidate(playerCacheKey(playerId, "full")),
        ]);
        PlayerCoreService.logger.info(
          `Cached profile picture for player ${playerId}${force ? " (force)" : ""}`
        );
        return;
      }

      PlayerCoreService.logger.warn(`Failed to cache profile picture for player ${playerId}`);
    }
  }

  /**
   * Gets the player's score stats.
   *
   * @param playerId the player's id
   * @returns the player's score stats
   */
  public static async getPlayerScoreStats(playerId: string): Promise<ScoreSaberPlayerScoreStats> {
    const scores = await ScoreSaberScoresRepository.getRankedRowsByPlayerId(playerId);

    const scoreStats: ScoreSaberPlayerScoreStats = {
      aPlays: 0,
      sPlays: 0,
      spPlays: 0,
      ssPlays: 0,
      sspPlays: 0,
      godPlays: 0,
    };

    for (const playerScore of scores) {
      const accuracy = playerScore.accuracy;
      if (accuracy >= 98) {
        scoreStats.godPlays++;
      } else if (accuracy >= 95) {
        scoreStats.sspPlays++;
      } else if (accuracy >= 90) {
        scoreStats.ssPlays++;
      } else if (accuracy >= 85) {
        scoreStats.spPlays++;
      } else if (accuracy >= 80) {
        scoreStats.sPlays++;
      } else if (accuracy >= 70) {
        scoreStats.aPlays++;
      }
    }
    return scoreStats;
  }
}
