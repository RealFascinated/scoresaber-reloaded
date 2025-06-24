import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import { Player, PlayerModel } from "@ssr/common/model/player";
import { PlayerRefreshResponse } from "@ssr/common/response/player-refresh-response";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import CacheService, { CacheId } from "../cache.service";
import { PlayerService } from "./player.service";

export const accountCreationLock: Record<string, Promise<Player>> = {};

export class PlayerCoreService {
  /**
   * Gets a player by id.
   *
   * @param id the player's id
   * @param create whether to create the player if it doesn't exist
   * @param playerToken an optional player token
   * @returns the player document if found
   * @throws NotFoundError if the player doesn't exist and create is false
   */
  public static async getPlayer(id: string, playerToken?: ScoreSaberPlayerToken): Promise<Player> {
    // Wait for the existing lock if it's in progress
    if (accountCreationLock[id] !== undefined) {
      return await accountCreationLock[id];
    }

    let player: Player | null = await CacheService.fetchWithCache(
      CacheId.Players,
      `player:${id}`,
      async () => PlayerModel.findOne({ _id: id }).lean()
    );

    if (player === null) {
      const success = await PlayerService.trackPlayer(id, playerToken);
      if (!success) {
        throw new NotFoundError(`Player "${id}" not found`);
      }

      player = await PlayerModel.findOne({ _id: id }).lean();
      if (!player) {
        throw new NotFoundError(`Player "${id}" not found after creation`);
      }
    }

    let shouldSave = false; // Whether to save the player
    const updates: Partial<Player> = {};

    if (playerToken) {
      // Update the player's name if it's different from the token
      if (playerToken.name !== player.name) {
        updates.name = playerToken.name;
        shouldSave = true;
      }

      // Update the players pp if it's different from the token
      if (playerToken.pp !== player.pp) {
        updates.pp = playerToken.pp;
        shouldSave = true;
      }

      // Update the player's country if it's different from the token
      if (playerToken.country !== player.country) {
        updates.country = playerToken.country;
        shouldSave = true;
      }
    }

    if (shouldSave) {
      await PlayerModel.updateOne({ _id: id }, { $set: updates });
      // Update the local player object with the new values
      Object.assign(player, updates);
    }

    return player;
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
}
