import { InternalServerError } from "@ssr/common/error/internal-server-error";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger from "@ssr/common/logger";
import { PlayerDocument, PlayerModel } from "@ssr/common/model/player";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { isProduction } from "@ssr/common/utils/utils";
import { fetchWithCache } from "../../common/cache.util";
import { logNewTrackedPlayer } from "../../common/embds";
import CacheService, { ServiceCache } from "../cache.service";

const accountCreationLock: { [id: string]: Promise<PlayerDocument> } = {};

export class PlayerCoreService {
  /**
   * Gets a player by id.
   *
   * @param id the player's id
   * @param create whether to create the player if it doesn't exist
   * @param playerToken an optional player token
   */
  public static async getPlayer(
    id: string,
    create: boolean = false,
    playerToken?: ScoreSaberPlayerToken
  ): Promise<PlayerDocument> {
    // Wait for the existing lock if it's in progress
    if (accountCreationLock[id] !== undefined) {
      await accountCreationLock[id];
    }

    let player: PlayerDocument | null = await fetchWithCache(
      CacheService.getCache(ServiceCache.Players),
      `player:${id}`,
      async () => PlayerModel.findOne({ _id: id })
    );

    if (player === null) {
      if (!create) {
        throw new NotFoundError(`Player "${id}" not found, create disabled`);
      }

      playerToken = playerToken || (await scoresaberService.lookupPlayer(id));

      if (!playerToken) {
        throw new NotFoundError(`Player "${id}" not found`);
      }

      // Create a new lock promise and assign it
      accountCreationLock[id] = (async () => {
        let newPlayer: PlayerDocument;
        try {
          Logger.info(`Creating player "${id}"...`);
          newPlayer = (await PlayerModel.create({ _id: id })) as PlayerDocument;
          newPlayer.trackedSince = new Date();
          await newPlayer.save();

          // Notify in production
          if (isProduction()) {
            await logNewTrackedPlayer(playerToken);
          }
        } catch (err) {
          Logger.error(`Failed to create player document for "${id}"`, err);
          throw new InternalServerError(`Failed to create player document for "${id}"`);
        } finally {
          // Ensure the lock is always removed
          delete accountCreationLock[id];
        }

        return newPlayer;
      })();

      // Wait for the player creation to complete
      player = await accountCreationLock[id];
    }

    if (playerToken && player.inactive !== playerToken.inactive) {
      player.inactive = playerToken.inactive;
      await player.save();
    }

    return player as PlayerDocument;
  }

  /**
   * Checks if a player exists.
   *
   * @param id the player's id
   * @returns whether the player exists
   */
  public static async playerExists(id: string): Promise<boolean> {
    return (await PlayerModel.exists({ _id: id })) !== null;
  }

  /**
   * Tracks a player.
   *
   * @param id the player's id
   */
  public static async trackPlayer(id: string) {
    try {
      if (await this.playerExists(id)) {
        return true;
      }
      await this.getPlayer(id, true);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensures a player exists.
   *
   * @param playerId the player's id
   */
  public static async ensurePlayerExists(playerId: string): Promise<void> {
    if (!(await PlayerCoreService.playerExists(playerId))) {
      throw new NotFoundError(`Player "${playerId}" not found`);
    }
  }

  public static async getPlayerHMD(id: string): Promise<string | undefined> {
    const player = await PlayerModel.findById(id).select("hmd").lean();
    return player?.hmd;
  }
}
