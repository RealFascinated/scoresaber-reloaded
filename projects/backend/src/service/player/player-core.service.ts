import { DetailType } from "@ssr/common/detail-type";
import { InternalServerError } from "@ssr/common/error/internal-server-error";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger, { type ScopedLogger } from "@ssr/common/logger";
import type { HMD } from "@ssr/common/schemas/hmd";
import { ScoreSaberAccount } from "@ssr/common/schemas/scoresaber/account";
import {
  isScoreSaberV2PlayerToken,
  type ScoreSaberPlayerLookupToken,
  type ScoreSaberV2PlayerToken,
} from "@ssr/common/schemas/scoresaber/tokens/v2/player/player";
import { chunkArray, isProduction } from "@ssr/common/utils/utils";
import { miniRankingResponseCacheKey, playerCacheKey } from "../../common/cache-keys";
import { logNewTrackedPlayer } from "../../common/embds";
import { redisClient } from "../../common/redis";
import { scoreSaberAccountRowToType } from "../../db/converter/scoresaber-account";
import { type ScoreSaberAccountRow } from "../../db/schema";
import { FetchMissingScoresQueue } from "../../queue/impl/player-scoresaber-scores-queue";
import { QueueId, QueueManager } from "../../queue/queue-manager";
import { ScoreSaberAccountNamesRepository } from "../../repositories/scoresaber-account-names.repository";
import { ScoreSaberAccountsRepository } from "../../repositories/scoresaber-accounts.repository";
import { ScoreSaberScoresRepository } from "../../repositories/scoresaber-scores.repository";
import { ScoreSaberApiService } from "../external/scoresaber-api.service";
import CacheService, { CacheId } from "../infra/cache.service";
import { RealmService } from "../realm/realm.service";

export const accountCreationLock: Record<string, Promise<ScoreSaberAccount | undefined>> = {};

export class PlayerCoreService {
  private static readonly logger: ScopedLogger = Logger.withTopic("Player Core");

  /**
   * Gets the account fields that differ from a freshly looked up token.
   *
   * @param account the stored account
   * @param playerToken the token to compare against
   */
  public static accountUpdatesFromToken(
    account: ScoreSaberAccountRow,
    playerToken: ScoreSaberPlayerLookupToken
  ) {
    const updates: Partial<Pick<ScoreSaberAccountRow, "name" | "country" | "banned" | "avatar">> = {};
    if (playerToken.name && playerToken.name !== account.name) {
      updates.name = playerToken.name;
    }
    if (playerToken.country !== account.country) {
      updates.country = playerToken.country ?? null;
    }
    if (playerToken.banned !== account.banned) {
      updates.banned = playerToken.banned ?? false;
    }
    if (account.avatar !== playerToken.avatar) {
      updates.avatar = playerToken.avatar;
    }
    return updates;
  }

  /**
   * Gets a player by id.
   *
   * @param id the player's id
   * @param playerToken an optional player token
   * @param options optional behavior (e.g. skip in-memory cache for bulk operations)
   * @returns the player document if found
   * @throws NotFoundError if the player doesn't exist on ScoreSaber
   */
  public static async getOrCreateAccount(id: string, playerToken?: ScoreSaberPlayerLookupToken) {
    id = String(id);

    if (accountCreationLock[id] !== undefined) {
      const result = await accountCreationLock[id];
      if (result === undefined) {
        throw new NotFoundError(`Player "${id}" not found after creation`);
      }
      return result;
    }

    let account = await ScoreSaberAccountsRepository.findRowById(id);

    if (!account) {
      let fullToken: ScoreSaberV2PlayerToken;
      if (playerToken && isScoreSaberV2PlayerToken(playerToken)) {
        fullToken = playerToken;
      } else {
        const result = await ScoreSaberApiService.lookupPlayer(id);
        if (!result.ok) {
          if (result.error === "not_found") {
            throw new NotFoundError(`Player "${id}" not found`);
          }
          throw new InternalServerError(`Failed to look up player "${id}": ${result.message}`);
        }
        fullToken = result.response;
      }
      const created = await PlayerCoreService.createPlayer(id, fullToken);
      if (!created) {
        throw new NotFoundError(`Player "${id}" not found after creation`);
      }
      account = await ScoreSaberAccountsRepository.findRowById(id);
      if (!account) {
        throw new NotFoundError(`Player "${id}" not found after creation`);
      }
    }

    const updates = playerToken ? PlayerCoreService.accountUpdatesFromToken(account, playerToken) : {};
    const shouldSave = Object.keys(updates).length > 0;

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
  public static async getAccount(id: string) {
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
  public static async createPlayer(id: string, playerToken?: ScoreSaberV2PlayerToken) {
    id = String(id);

    let lockPromise = accountCreationLock[id];
    if (lockPromise === undefined) {
      lockPromise = (async () => {
        try {
          const existingRow = await ScoreSaberAccountsRepository.findRowById(id);
          if (existingRow) {
            return scoreSaberAccountRowToType(existingRow);
          }

          let token = playerToken;
          if (!token) {
            const result = await ScoreSaberApiService.lookupPlayer(id);
            if (!result.ok) {
              PlayerCoreService.logger.warn(
                `Failed to look up player "${id}" for creation: ${result.message}`
              );
              return undefined;
            }
            token = result.response;
          }

          try {
            PlayerCoreService.logger.info(`Creating player "${id}"...`);

            const playerInsert: ScoreSaberAccountRow = {
              id: id,
              name: token.name,
              country: token.country,
              avatar: token.avatar,
              peakRank: token.stats.rank,
              peakRankTimestamp: new Date(),
              seededScores: false,
              seededBeatLeaderScores: false,
              beatLeaderSeedPage: 0,
              beatLeaderSeedAttempts: 0,
              beatLeaderSeedLastAttempt: null,
              trackReplays: false,
              inactive: token.inactive,
              banned: token.banned,
              pp: token.stats.totalPP,
              medals: 0,
              medalsRank: 0,
              medalsCountryRank: 0,
              hmd: "Unknown" as HMD,
              currentStreak: 0,
              longestStreak: 0,
              lastPlayedDate: null,
              trackedSince: new Date(),
              joinedDate: new Date(token.createdAt),
            };
            await ScoreSaberAccountsRepository.insert(playerInsert);

            const trackedScores = await ScoreSaberScoresRepository.countByPlayerId(id);
            if (trackedScores < token.stats.totalSubmittedPlays) {
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

  public static async createIfMissing(id: string) {
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
  public static async playerExists(id: string, throwIfNotFound: boolean = false) {
    const exists = await ScoreSaberAccountsRepository.existsById(id);
    if (throwIfNotFound && !exists) {
      throw new NotFoundError(`Player "${id}" not found`);
    }
    return exists;
  }

  /**
   * Drops every cached view of a player: profiles in every realm and detail type.
   *
   * The player cache has no short TTL, so anything that changes what a profile shows must call this.
   *
   * @param playerId the player's id
   */
  public static async invalidatePlayerCaches(playerId: string) {
    for (const realmId of await RealmService.getRealmIds()) {
      CacheService.invalidateMemoryKey(
        CacheId.SCORESABER_MINI_RANKING_RESPONSE,
        miniRankingResponseCacheKey(playerId, realmId)
      );
    }
    await PlayerCoreService.invalidatePlayersCaches([playerId]);
  }

  /**
   * Drops the cached profiles of many players, e.g. every player affected by a map ranked batch.
   *
   * @param playerIds the players' ids
   * @param scope limits what is dropped to some detail types and/or realms (everything when omitted)
   */
  public static async invalidatePlayersCaches(
    playerIds: string[],
    scope?: { detailTypes?: DetailType[]; realmIds?: number[] }
  ) {
    if (playerIds.length === 0) {
      return;
    }

    const realmIds = scope?.realmIds ?? (await RealmService.getRealmIds());
    const detailTypes: DetailType[] = scope?.detailTypes ?? ["basic", "full"];
    const keys = playerIds.flatMap(playerId =>
      realmIds.flatMap(realmId => detailTypes.map(type => playerCacheKey(playerId, type, realmId)))
    );

    for (const batch of chunkArray(keys, 1000)) {
      await redisClient.del(...batch);
    }
  }

  /**
   * Refreshes a player.
   *
   * @param id the player's id
   * @returns the player document if found
   */
  public static async refreshPlayer(id: string) {
    const result = await ScoreSaberApiService.refreshPlayer(id);
    if (!result.ok) {
      PlayerCoreService.logger.warn(`Failed to refresh player "${id}": ${result.message}`);
      return { result: false };
    }
    await PlayerCoreService.invalidatePlayerCaches(id);
    return result.response;
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
  ) {
    if (Object.keys(patch).length === 0) {
      return;
    }

    const existing =
      patch.name !== undefined ? await ScoreSaberAccountsRepository.findRowById(playerId) : undefined;

    const updated = await ScoreSaberAccountsRepository.updateAccount(playerId, patch);
    if (!updated) {
      return;
    }

    if (existing && patch.name !== undefined && existing.name !== patch.name) {
      await ScoreSaberAccountNamesRepository.recordNameChange(playerId, existing.name, patch.name);
    }

    if (options?.invalidateCache !== false) {
      await PlayerCoreService.invalidatePlayerCaches(playerId);
    }
  }
}
