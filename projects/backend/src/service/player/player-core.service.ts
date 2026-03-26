import { InternalServerError } from "@ssr/common/error/internal-server-error";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger from "@ssr/common/logger";
import { StorageBucket } from "@ssr/common/minio-buckets";
import { Player, PlayerModel } from "@ssr/common/model/player/player";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { PlayerRefreshResponse } from "@ssr/common/schemas/response/player/player-refresh";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import Request from "@ssr/common/utils/request";
import { isProduction } from "@ssr/common/utils/utils";
import { logNewTrackedPlayer } from "../../common/embds";
import { FetchMissingScoresQueue } from "../../queue/impl/fetch-missing-scores-queue";
import { QueueId, QueueManager } from "../../queue/queue-manager";
import CacheService, { CacheId } from "../cache.service";
import { ScoreSaberApiService } from "../scoresaber-api.service";
import StorageService from "../storage.service";

export const accountCreationLock: Record<string, Promise<Player | undefined>> = {};

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
  ): Promise<Player> {
    const useCache = options?.useCache !== false;

    // Wait for the existing lock if it's in progress
    if (accountCreationLock[id] !== undefined) {
      const result = await accountCreationLock[id];
      if (result === undefined) {
        throw new NotFoundError(`Player "${id}" not found after creation`);
      }
      return result;
    }

    let player: Player | null | undefined = await (useCache
      ? CacheService.fetch(CacheId.Players, `player:${id}`, async () =>
        PlayerModel.findOne({ _id: id }).lean()
      )
      : PlayerModel.findOne({ _id: id }).lean());

    if (player === null) {
      player = await PlayerCoreService.createPlayer(id, playerToken);
      if (!player) {
        throw new NotFoundError(`Player "${id}" not found after creation`);
      }
    }

    let shouldSave = false;
    const updates: Partial<Player> = {};

    if (playerToken) {
      if (playerToken.name !== player.name) {
        updates.name = playerToken.name;
        shouldSave = true;
      }
      if (playerToken.pp !== player.pp) {
        updates.pp = playerToken.pp;
        shouldSave = true;
      }
      if (playerToken.country !== player.country) {
        updates.country = playerToken.country;
        shouldSave = true;
      }
      if (playerToken.banned !== player.banned) {
        updates.banned = playerToken.banned;
        shouldSave = true;
      }
    }

    if (shouldSave) {
      await PlayerModel.updateOne({ _id: id }, { $set: updates });
      Object.assign(player, updates);
      if (!useCache) {
        await CacheService.invalidate(`player:${id}`);
      }
    }

    return player;
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
  ): Promise<Player | undefined> {
    let lockPromise = accountCreationLock[id];
    if (lockPromise === undefined) {
      lockPromise = (async (): Promise<Player | undefined> => {
        try {
          if (await PlayerCoreService.playerExists(id)) {
            return (await PlayerModel.findOne({ _id: id }).lean()) ?? undefined;
          }

          const token = playerToken || (await ScoreSaberApiService.lookupPlayer(id));
          if (!token) {
            return undefined;
          }

          try {
            Logger.info(`Creating player "${id}"...`);
            const newPlayer = await PlayerModel.create({
              _id: id,
              joinedDate: new Date(token.firstSeen),
              inactive: token.inactive,
              name: token.name,
              trackedSince: new Date(),
            });

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
              await PlayerModel.updateOne({ _id: newPlayer._id }, { $set: { seededScores: true } });
            }

            if (isProduction()) {
              await logNewTrackedPlayer(token);
            }
            return newPlayer.toObject();
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
    const player = await PlayerModel.exists({ _id: id });
    if (throwIfNotFound && !player) {
      throw new NotFoundError(`Player "${id}" not found`);
    }
    return player !== null;
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
   * Updates the player's name.
   *
   * @param playerId the player's id
   * @param name the new name
   */
  public static async updatePlayerName(playerId: string, name: string) {
    // Only update if name has changed
    const player = await PlayerModel.findById(playerId).select("name").lean();
    if (player && player.name === name) {
      return; // Name hasn't changed, skip write
    }
    await PlayerModel.updateOne({ _id: playerId }, { $set: { name } });
  }

  /**
   * Updates the player's peak rank.
   *
   * @param playerToken the player's token
   */
  public static async updatePeakRank(playerToken: ScoreSaberPlayerToken) {
    const player = await PlayerModel.findById(playerToken.id).select("peakRank").lean();
    if (!player) {
      return;
    }

    if (playerToken.rank == 0) {
      return player;
    }

    if (!player.peakRank || (player.peakRank && playerToken.rank < player.peakRank.rank)) {
      const newPeakRank = {
        rank: playerToken.rank,
        date: new Date(),
      };

      await PlayerModel.updateOne({ _id: player._id }, { $set: { peakRank: newPeakRank } });

      // Update the local player object
      player.peakRank = newPeakRank;
    }

    return player;
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
        await PlayerModel.updateOne({ _id: playerId }, { $set: { cachedProfilePicture: true } });
        await CacheService.invalidate(`player:${playerId}`);
        Logger.info(`Cached profile picture for player ${playerId}${force ? " (force)" : ""}`);
        return;
      }

      Logger.warn(`Failed to cache profile picture for player ${playerId}`);
    }
  }
}
