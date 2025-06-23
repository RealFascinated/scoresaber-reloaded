import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { DetailType } from "@ssr/common/detail-type";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger from "@ssr/common/logger";
import {
  scoreSaberCachedPlayerToObject,
  ScoreSaberPlayerCacheDocument,
  ScoreSaberPlayerCacheModel,
} from "@ssr/common/model/scoresaber-player-cache";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ScoreSaberLeaderboardPlayerInfoToken } from "@ssr/common/types/token/scoresaber/leaderboard-player-info";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { getPlayerStatisticChanges } from "@ssr/common/utils/player-utils";
import { getDaysAgoDate } from "@ssr/common/utils/time-utils";
import { getPageFromRank } from "@ssr/common/utils/utils";
import sanitize from "sanitize-html";
import CacheService, { CacheId } from "./cache.service";
import { PlayerService } from "./player/player.service";

export default class ScoreSaberService {
  /**
   * Gets a ScoreSaber player using their account id.
   *
   * @param id the player's account id
   * @param createIfMissing creates the player if they don't have an account with us
   * @returns the player
   */
  public static async getPlayer(
    id: string,
    type: DetailType = DetailType.BASIC,
    playerToken?: ScoreSaberPlayerToken
  ): Promise<ScoreSaberPlayer> {
    return CacheService.fetchWithCache(
      CacheId.ScoreSaber,
      `scoresaber:player:${id}:${type}`,
      async () => {
        // Start fetching player token and account in parallel
        const [player, account] = await Promise.all([
          playerToken ?? ApiServiceRegistry.getInstance().getScoreSaberService().lookupPlayer(id),
          PlayerService.getPlayer(id).catch(() => undefined),
        ]);

        if (!player) {
          throw new NotFoundError(`Player "${id}" not found`);
        }

        // For basic type, return early with minimal data
        const basePlayer = {
          id: player.id,
          name: player.name,
          avatar: player.profilePicture,
          country: player.country,
          rank: player.rank,
          countryRank: player.countryRank,
          pp: player.pp,
          hmd: await PlayerService.getPlayerHMD(player.id),
          joinedDate: new Date(player.firstSeen),
          role: player.role ?? undefined,
          permissions: player.permissions,
          banned: player.banned,
          inactive: player.inactive,
          trackedSince: account?.trackedSince ?? new Date(),
          rankPages: {
            global: getPageFromRank(player.rank, 50),
            country: getPageFromRank(player.countryRank, 50),
          },
        } as ScoreSaberPlayer;

        if (type === DetailType.BASIC) {
          return basePlayer;
        }

        // For full type, run all operations in parallel
        const [updatedAccount, ppBoundaries, accBadges, statisticHistory, playerHMD] =
          await Promise.all([
            account ? PlayerService.updatePeakRank(id, player) : undefined,
            account ? PlayerService.getPlayerPpBoundary(id, 1) : [],
            account ? PlayerService.getAccBadges(id) : {},
            PlayerService.getPlayerStatisticHistory(player, new Date(), getDaysAgoDate(30)),
            PlayerService.getPlayerHMD(player.id),
            PlayerService.updatePlayerName(player.id, player.name),
          ]);

        // Calculate all statistic changes in parallel
        const [dailyChanges, weeklyChanges, monthlyChanges] = await Promise.all([
          account ? getPlayerStatisticChanges(statisticHistory, 1) : {},
          account ? getPlayerStatisticChanges(statisticHistory, 7) : {},
          account ? getPlayerStatisticChanges(statisticHistory, 30) : {},
        ]);

        return {
          ...basePlayer,
          hmd: playerHMD,
          bio: {
            lines: player.bio ? sanitize(player.bio).split("\n") : [],
            linesStripped: player.bio
              ? sanitize(player.bio.replace(/<[^>]+>/g, "")).split("\n")
              : [],
          },
          badges:
            player.badges?.map(badge => ({
              url: badge.image,
              description: badge.description,
            })) || [],
          statisticChange: {
            daily: dailyChanges,
            weekly: weeklyChanges,
            monthly: monthlyChanges,
          },
          plusOnePP: ppBoundaries[0],
          accBadges,
          peakRank: updatedAccount?.peakRank,
          statistics: player.scoreStats,
          rankPages: {
            global: getPageFromRank(player.rank, 50),
            country: getPageFromRank(player.countryRank, 50),
          },
        } as ScoreSaberPlayer;
      }
    );
  }

  /**
   * Gets a cached ScoreSaber player token.
   *
   * @param id the player's id
   * @param cacheOnly whether to only check the cache
   * @returns the player token
   */
  public static async getCachedPlayer(
    id: string,
    cacheOnly: boolean = false
  ): Promise<ScoreSaberPlayerToken> {
    if (await ScoreSaberPlayerCacheModel.exists({ _id: id })) {
      const player = await ScoreSaberPlayerCacheModel.findOne({ _id: id }).lean();

      // Check the cache status of the player
      if (
        player &&
        ((player.lastUpdated &&
          // If the player was updated less than 6 hours ago, return the cached player
          new Date().getTime() - player.lastUpdated.getTime() < 6 * 60 * 60 * 1000) ||
          // If the player was last updated more than 3 days ago, update the player reguardless of the cache only flag
          (cacheOnly &&
            new Date().getTime() - player.lastUpdated.getTime() < 3 * 24 * 60 * 60 * 1000))
      ) {
        return scoreSaberCachedPlayerToObject(player as unknown as ScoreSaberPlayerCacheDocument);
      }
    }

    // Fetch the player from the API
    const player = await ApiServiceRegistry.getInstance().getScoreSaberService().lookupPlayer(id);
    if (!player) {
      throw new NotFoundError(`Player "${id}" not found`);
    }

    // Update the player in the cache
    return scoreSaberCachedPlayerToObject(
      (await ScoreSaberPlayerCacheModel.findOneAndUpdate(
        { _id: id },
        {
          ...player,
          lastUpdated: new Date(),
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      ).lean()) as unknown as ScoreSaberPlayerCacheDocument
    );
  }

  /**
   * Updates the player token inside the player cache.
   *
   * @param player the player to update
   */
  public static async updatePlayerCache(
    playerToken: ScoreSaberPlayerToken | ScoreSaberLeaderboardPlayerInfoToken
  ): Promise<ScoreSaberPlayerToken | undefined> {
    const player = await this.getCachedPlayer(playerToken.id, true).catch(() => undefined);
    if (player == undefined) {
      Logger.warn(`Player "${playerToken.id}" not found on ScoreSaber`);
      return undefined;
    }

    // Check if the player has changed
    if (playerToken.name !== player.name || playerToken.country !== player.country) {
      return scoreSaberCachedPlayerToObject(
        (await ScoreSaberPlayerCacheModel.findOneAndUpdate(
          { _id: player.id },
          {
            $set: {
              name: playerToken.name,
              country: playerToken.country,
            },
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          }
        ).lean()) as unknown as ScoreSaberPlayerCacheDocument
      );
    }

    return player;
  }
}
