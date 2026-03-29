import { InternalServerError } from "@ssr/common/error/internal-server-error";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import { HMD } from "@ssr/common/hmds";
import Logger from "@ssr/common/logger";
import { StorageBucket } from "@ssr/common/minio-buckets";
import { PlayerScoreStats } from "@ssr/common/model/player/player-score-stats";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { PlayerRefreshResponse } from "@ssr/common/schemas/response/player/player-refresh";
import { ScoreSaberAccount } from "@ssr/common/schemas/scoresaber/account";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import Request from "@ssr/common/utils/request";
import { isProduction } from "@ssr/common/utils/utils";
import { and, eq, gt } from "drizzle-orm";
import { logNewTrackedPlayer } from "../../common/embds";
import { db } from "../../db";
import { scoreSaberAccountRowToType } from "../../db/converter/scoresaber-account";
import { scoreSaberAccountsTable, scoreSaberScoresTable, type ScoreSaberAccountRow } from "../../db/schema";
import { FetchMissingScoresQueue } from "../../queue/impl/fetch-missing-scores-queue";
import { QueueId, QueueManager } from "../../queue/queue-manager";
import CacheService from "../cache.service";
import { ScoreSaberApiService } from "../scoresaber-api.service";
import StorageService from "../storage.service";

export const accountCreationLock: Record<string, Promise<ScoreSaberAccount | undefined>> = {};

/** Partial row update for `scoresaber-accounts` (`id` is passed as the first argument). */
export type ScoreSaberAccountUpdate = Partial<Omit<ScoreSaberAccountRow, "id">>;

export class PlayerCoreService {
  /**
   * Gets a player by id.
   *
   * @param id the player's id
   * @param playerToken an optional player token
   * @param options optional behavior (e.g. skip in-memory cache for bulk operations)
   * @returns the player document if found
   * @throws NotFoundError if the player doesn't exist on ScoreSaber
   */
  public static async getPlayer(
    id: string,
    playerToken?: ScoreSaberPlayerToken,
    options?: {
      useCache?: boolean;
    }
  ): Promise<ScoreSaberAccount> {
    const useCache = options?.useCache !== false;

    // Wait for the existing lock if it's in progress
    if (accountCreationLock[id] !== undefined) {
      const result = await accountCreationLock[id];
      if (result === undefined) {
        throw new NotFoundError(`Player "${id}" not found after creation`);
      }
      return result;
    }

    let [account] = await db
      .select()
      .from(scoreSaberAccountsTable)
      .where(eq(scoreSaberAccountsTable.id, id))
      .limit(1);

    if (!account) {
      const created = await PlayerCoreService.createPlayer(id, playerToken);
      if (!created) {
        throw new NotFoundError(`Player "${id}" not found after creation`);
      }
      [account] = await db
        .select()
        .from(scoreSaberAccountsTable)
        .where(eq(scoreSaberAccountsTable.id, id))
        .limit(1);
      if (!account) {
        throw new NotFoundError(`Player "${id}" not found after creation`);
      }
    }

    let shouldSave = false;
    const updates: Partial<Pick<ScoreSaberAccountRow, "country" | "banned">> = {};
    if (playerToken?.country !== account.country) {
      updates.country = playerToken?.country ?? null;
      shouldSave = true;
    }
    if (playerToken?.banned !== account.banned) {
      updates.banned = playerToken?.banned ?? false;
      shouldSave = true;
    }

    if (shouldSave) {
      await db.update(scoreSaberAccountsTable).set(updates).where(eq(scoreSaberAccountsTable.id, id));
      Object.assign(account, updates);
      if (!useCache) {
        await CacheService.invalidate(`player:${id}`);
      }
    }

    return scoreSaberAccountRowToType(account);
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
          const [existingRow] = await db
            .select()
            .from(scoreSaberAccountsTable)
            .where(eq(scoreSaberAccountsTable.id, id))
            .limit(1);
          if (existingRow) {
            return scoreSaberAccountRowToType(existingRow);
          }

          const token = playerToken || (await ScoreSaberApiService.lookupPlayer(id));
          if (!token) {
            return undefined;
          }

          try {
            Logger.info(`Creating player "${id}"...`);
            const newAccount = await db
              .insert(scoreSaberAccountsTable)
              .values({
                id: id,
                name: token.name,
                country: token.country ?? null,
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
                hmd: "Unknown" as HMD,
                scoreStats: {
                  aPlays: 0,
                  sPlays: 0,
                  spPlays: 0,
                  ssPlays: 0,
                  sspPlays: 0,
                  godPlays: 0,
                },
                trackedSince: new Date(),
                joinedDate: new Date(token.firstSeen),
              })
              .returning();

            // If the player has less scores tracked than the total play count, add them to the refresh queue
            const trackedScores = await ScoreSaberScoreModel.countDocuments({ playerId: id });
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
              await db
                .update(scoreSaberAccountsTable)
                .set({ seededScores: true })
                .where(eq(scoreSaberAccountsTable.id, id));
            }

            if (isProduction()) {
              await logNewTrackedPlayer(token);
            }
            const [inserted] = newAccount;
            if (!inserted) {
              throw new InternalServerError(`Insert did not return a row for player "${id}"`);
            }
            return scoreSaberAccountRowToType(inserted);
          } catch (err) {
            Logger.error(`Failed to create player document for "${id}"`, err);
            throw new InternalServerError(`Failed to create player document for "${id}"`);
          } finally {
            delete accountCreationLock[id];
          }
        } catch (err) {
          if (err instanceof InternalServerError) {
            throw err;
          }
          Logger.error(`Failed to create player document for "${id}"`, err);
          return undefined;
        } finally {
          delete accountCreationLock[id];
        }
      })();
      accountCreationLock[id] = lockPromise;
    }
    return lockPromise;
  }

  /**
   * Checks if a player exists.
   *
   * @param id the player's id
   * @returns whether the player exists
   */
  public static async playerExists(id: string, throwIfNotFound: boolean = false): Promise<boolean> {
    const [row] = await db
      .select()
      .from(scoreSaberAccountsTable)
      .where(eq(scoreSaberAccountsTable.id, id))
      .limit(1);
    const exists = row !== undefined;
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
      CacheService.invalidate(`scoresaber:player:${id}`);
      CacheService.invalidate(`player:${id}`);

      const isOculusAccount = id.length === 16;
      if (!isOculusAccount) {
        await PlayerCoreService.cachePlayerProfilePicture(id, true);
      }
      return response;
    }
    return { result: false };
  }

  /**
   * Partial update on the `scoresaber-accounts` row. Uses table column shapes (e.g. `peakRank` + `peakRankTimestamp`, not nested `peakRank`).
   */
  public static async updatePlayer(
    playerId: string,
    patch: ScoreSaberAccountUpdate,
    options?: { invalidateCache?: boolean }
  ): Promise<void> {
    if (Object.keys(patch).length === 0) {
      return;
    }

    await db.update(scoreSaberAccountsTable).set(patch).where(eq(scoreSaberAccountsTable.id, playerId));

    if (options?.invalidateCache !== false) {
      await CacheService.invalidate(`player:${playerId}`);
    }
  }

  /**
   * Updates the player's name.
   *
   * @param playerId the player's id
   * @param name the new name
   */
  public static async updatePlayerName(playerId: string, name: string) {
    // Only update if name has changed
    const [row] = await db
      .select()
      .from(scoreSaberAccountsTable)
      .where(eq(scoreSaberAccountsTable.id, playerId))
      .limit(1);
    if (!row) {
      return;
    }
    if (row.name === name) {
      return;
    }
    await db.update(scoreSaberAccountsTable).set({ name }).where(eq(scoreSaberAccountsTable.id, playerId));
  }

  /**
   * Updates the player's peak rank.
   *
   * @param playerToken the player's token
   */
  public static async updatePeakRank(playerToken: ScoreSaberPlayerToken) {
    const [account] = await db
      .select()
      .from(scoreSaberAccountsTable)
      .where(eq(scoreSaberAccountsTable.id, playerToken.id))
      .limit(1);
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
      await db
        .update(scoreSaberAccountsTable)
        .set({ peakRank: playerToken.rank, peakRankTimestamp: new Date() })
        .where(eq(scoreSaberAccountsTable.id, playerToken.id));
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
        await db
          .update(scoreSaberAccountsTable)
          .set({ cachedProfilePicture: true })
          .where(eq(scoreSaberAccountsTable.id, playerId));
        await CacheService.invalidate(`player:${playerId}`);
        Logger.info(`Cached profile picture for player ${playerId}${force ? " (force)" : ""}`);
        return;
      }

      Logger.warn(`Failed to cache profile picture for player ${playerId}`);
    }
  }

  /**
   * Gets the player's score stats.
   *
   * @param playerId the player's id
   * @returns the player's score stats
   */
  public static async getPlayerScoreStats(playerId: string): Promise<PlayerScoreStats> {
    const scores = await db
      .select()
      .from(scoreSaberScoresTable)
      .where(and(eq(scoreSaberScoresTable.playerId, playerId), gt(scoreSaberScoresTable.pp, 0)));

    const scoreStats: PlayerScoreStats = {
      godPlays: 0,
      sspPlays: 0,
      ssPlays: 0,
      spPlays: 0,
      sPlays: 0,
      aPlays: 0,
    };

    for (const playerScore of scores) {
      const accuracy = playerScore.accuracy;
      if (accuracy >= 98) scoreStats.godPlays++;
      else if (accuracy >= 95) scoreStats.sspPlays++;
      else if (accuracy >= 90) scoreStats.ssPlays++;
      else if (accuracy >= 85) scoreStats.spPlays++;
      else if (accuracy >= 80) scoreStats.sPlays++;
      else if (accuracy >= 70) scoreStats.aPlays++;
    }
    return scoreStats;
  }
}
