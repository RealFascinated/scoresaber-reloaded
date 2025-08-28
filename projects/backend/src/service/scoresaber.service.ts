import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { DetailType } from "@ssr/common/detail-type";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger from "@ssr/common/logger";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { getPlayerStatisticChanges } from "@ssr/common/utils/player-utils";
import { getDaysAgoDate, TimeUnit } from "@ssr/common/utils/time-utils";
import { getPageFromRank } from "@ssr/common/utils/utils";
import sanitize from "sanitize-html";
import SuperJSON from "superjson";
import CacheService, { CacheId } from "./cache.service";
import { PlayerService } from "./player/player.service";
import { redisClient } from "../common/redis";

// Type for cached player data with timestamp
type CachedScoreSaberPlayerToken = ScoreSaberPlayerToken & {
  lastUpdated: string;
};

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
    player?: ScoreSaberPlayerToken
  ): Promise<ScoreSaberPlayer> {
    return CacheService.fetchWithCache(
      CacheId.ScoreSaber,
      `scoresaber:player:${id}:${type}`,
      async () => {
        player ??= await ApiServiceRegistry.getInstance().getScoreSaberService().lookupPlayer(id);
        if (!player) {
          throw new NotFoundError(`Player "${id}" not found`);
        }

        // Start fetching player token and account in parallel
        const [account, medalsRank, globalRankIncludingInactives] = await Promise.all([
          PlayerService.getPlayer(id, player).catch(() => undefined),
          PlayerService.getPlayerMedalRank(id),
          PlayerService.getPlayerRankIncludingInactives(id),
        ]);

        const isOculusAccount = player.id.length === 16;

        // For basic type, return early with minimal data
        const basePlayer = {
          id: player.id,
          name: player.name,
          avatar: isOculusAccount
            ? "https://cdn.fascinated.cc/assets/oculus-avatar.jpg"
            : player.profilePicture,
          country: player.country,
          rank: player.rank,
          countryRank: player.countryRank,
          rankIncludingInactives: globalRankIncludingInactives ?? undefined,
          pp: player.pp,
          hmd: account?.hmd ?? undefined,
          joinedDate: new Date(player.firstSeen),
          role: player.role ?? undefined,
          permissions: player.permissions,
          banned: player.banned,
          inactive: player.inactive,
          trackedSince: account?.trackedSince ?? new Date(),
          medals: account?.medals ?? 0,
          rankPages: {
            global: getPageFromRank(player.rank, 50),
            country: getPageFromRank(player.countryRank, 50),
            medals: medalsRank ? getPageFromRank(medalsRank, 50) : undefined,
          },
        } as ScoreSaberPlayer;

        if (type === DetailType.BASIC) {
          return basePlayer;
        }

        // For full type, run all operations in parallel
        const [updatedAccount, ppBoundaries, accBadges, statisticHistory] = await Promise.all([
          account ? PlayerService.updatePeakRank(id, player) : undefined,
          account ? PlayerService.getPlayerPpBoundary(id, 1) : [],
          account ? PlayerService.getAccBadges(id) : {},
          PlayerService.getPlayerStatisticHistory(player, new Date(), getDaysAgoDate(30), {
            rank: true,
            countryRank: true,
            pp: true,
            medals: true,
          }),
        ]);

        // Calculate all statistic changes in parallel
        const [dailyChanges, weeklyChanges, monthlyChanges] = await Promise.all([
          account ? getPlayerStatisticChanges(statisticHistory, 1) : {},
          account ? getPlayerStatisticChanges(statisticHistory, 7) : {},
          account ? getPlayerStatisticChanges(statisticHistory, 30) : {},
        ]);

        return {
          ...basePlayer,
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
    const cacheKey = `scoresaber:cached-player:${id}`;

    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      try {
        const player = SuperJSON.parse(cachedData) as CachedScoreSaberPlayerToken;

        const cacheAge = new Date().getTime() - new Date(player.lastUpdated).getTime();
        const refreshInterval = cacheOnly
          ? TimeUnit.toMillis(TimeUnit.Day, 30)
          : TimeUnit.toMillis(TimeUnit.Hour, 12);

        if (cacheAge < refreshInterval) {
          return player;
        }
      } catch {
        Logger.warn(`Failed to parse cached player data for ${id}, removing from cache`);
        await redisClient.del(cacheKey);
      }
    }

    const player = await ApiServiceRegistry.getInstance().getScoreSaberService().lookupPlayer(id);
    if (!player) {
      throw new NotFoundError(`Player "${id}" not found`);
    }

    const playerWithTimestamp: CachedScoreSaberPlayerToken = {
      ...player,
      lastUpdated: new Date().toISOString(),
    };

    await redisClient.set(
      cacheKey,
      SuperJSON.stringify(playerWithTimestamp),
      "EX",
      TimeUnit.toSeconds(TimeUnit.Day, 30)
    );

    return playerWithTimestamp;
  }
}
