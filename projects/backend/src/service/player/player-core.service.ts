import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { InternalServerError } from "@ssr/common/error/internal-server-error";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger from "@ssr/common/logger";
import { Player, PlayerModel } from "@ssr/common/model/player/player";
import { PlayerRefreshResponse } from "@ssr/common/schemas/response/player/player-refresh";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { isProduction } from "@ssr/common/utils/utils";
import { logNewTrackedPlayer } from "../../common/embds";
import { FetchMissingScoresQueue } from "../../queue/impl/fetch-missing-scores-queue";
import { QueueId, QueueManager } from "../../queue/queue-manager";
import CacheService, { CacheId } from "../cache.service";
import ScoreSaberService from "../scoresaber.service";

export const accountCreationLock: Record<string, Promise<Player>> = {};

export class PlayerCoreService {
  /**
   * Gets a player by id.
   *
   * @param id the player's id
   * @param playerToken an optional player token
   * @returns the player document if found
   * @throws NotFoundError if the player doesn't exist on ScoreSaber
   */
  public static async getPlayer(id: string, playerToken?: ScoreSaberPlayerToken): Promise<Player> {
    // Wait for the existing lock if it's in progress
    if (accountCreationLock[id] !== undefined) {
      return await accountCreationLock[id];
    }

    let player: Player | null | undefined = await CacheService.fetchWithCache(
      CacheId.Players,
      `player:${id}`,
      async () => PlayerModel.findOne({ _id: id }).lean()
    );

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
    try {
      if (await PlayerCoreService.playerExists(id)) {
        return undefined;
      }

      playerToken = playerToken || (await ScoreSaberService.getCachedPlayer(id, true));
      if (!playerToken) {
        return undefined;
      }

      // Create a new lock promise and assign it
      accountCreationLock[id] = (async () => {
        try {
          Logger.info(`Creating player "${id}"...`);
          const newPlayer = await PlayerModel.create({
            _id: id,
            joinedDate: new Date(playerToken.firstSeen),
            inactive: playerToken.inactive,
            name: playerToken.name,
            trackedSince: new Date(),
          });

          const seedQueue = QueueManager.getQueue(
            QueueId.PlayerScoreRefreshQueue
          ) as FetchMissingScoresQueue;
          if (!(await seedQueue.hasItem({ id: id, data: id }))) {
            (QueueManager.getQueue(QueueId.PlayerScoreRefreshQueue) as FetchMissingScoresQueue).add(
              {
                id,
                data: id,
              }
            );
          }

          // Notify in production
          if (isProduction()) {
            await logNewTrackedPlayer(playerToken);
          }
          return newPlayer.toObject();
        } catch (err) {
          Logger.error(`Failed to create player document for "${id}"`, err);
          throw new InternalServerError(`Failed to create player document for "${id}"`);
        } finally {
          // Ensure the lock is always removed
          delete accountCreationLock[id];
        }
      })();

      // Return the player document
      return await accountCreationLock[id];
    } catch (err) {
      Logger.error(`Failed to create player document for "${id}"`, err);
      return undefined;
    }
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
    const response = await ApiServiceRegistry.getInstance()
      .getScoreSaberService()
      .refreshPlayer(id);
    if (response !== undefined) {
      CacheService.invalidate(`scoresaber:player:${id}`); // Remove the player from the cache
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
    await PlayerModel.updateOne({ _id: playerId }, { $set: { name } });
  }

  /**
   * Updates the player's peak rank.
   *
   * @param playerId the player's id
   * @param playerToken the player's token
   */
  public static async updatePeakRank(player: Player, playerToken: ScoreSaberPlayerToken) {
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
}
