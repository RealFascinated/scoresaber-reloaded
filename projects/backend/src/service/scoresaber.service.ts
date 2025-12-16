import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { DetailType } from "@ssr/common/detail-type";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import { HMD } from "@ssr/common/hmds";
import Logger from "@ssr/common/logger";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ScoreSaberLeaderboardPlayerInfoToken } from "@ssr/common/types/token/scoresaber/leaderboard-player-info";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { getPlayerStatisticChanges } from "@ssr/common/utils/player-utils";
import { getDaysAgoDate, TimeUnit } from "@ssr/common/utils/time-utils";
import { getPageFromRank } from "@ssr/common/utils/utils";
import SuperJSON from "superjson";
import { redisClient } from "../common/redis";
import CacheService, { CacheId } from "./cache.service";
import MetricsService, { MetricType } from "./metrics.service";
import { PlayerAccuraciesService } from "./player/player-accuracies.service";
import { PlayerCoreService } from "./player/player-core.service";
import { PlayerHistoryService } from "./player/player-history.service";
import { PlayerHmdService } from "./player/player-hmd.service";
import { PlayerMedalsService } from "./player/player-medals.service";
import { PlayerRankedService } from "./player/player-ranked.service";

const CACHED_PLAYER_EXPIRY = TimeUnit.toSeconds(TimeUnit.Month, 3);

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
    type: DetailType = "basic",
    player?: ScoreSaberPlayerToken
  ): Promise<ScoreSaberPlayer> {
    player ??= await ScoreSaberService.getCachedPlayer(id, true);
    if (!player) {
      throw new NotFoundError(`Player "${id}" not found`);
    }

    return CacheService.fetchWithCache(CacheId.ScoreSaber, `scoresaber:player:${id}:${type}`, async () => {
      const account = await PlayerCoreService.getPlayer(id, player).catch(() => undefined);
      const isOculusAccount = player.id.length === 16;

      const basePlayer = {
        id: player.id,
        name: player.name,
        avatar: isOculusAccount ? "https://cdn.fascinated.cc/assets/oculus-avatar.jpg" : player.profilePicture,
        country: player.country,
        rank: player.rank,
        countryRank: player.countryRank,
        pp: player.pp,
        medals: account?.medals ?? 0,
        hmd: account?.hmd ?? undefined,
        role: player.role ?? undefined,
        permissions: player.permissions,
        banned: player.banned,
        inactive: player.inactive,
        trackedSince: account?.trackedSince ?? new Date(),
        joinedDate: new Date(player.firstSeen),
      } as ScoreSaberPlayer;

      if (type === "basic") {
        return basePlayer;
      }

      /**
       * Gets a player's statistic history for a specific date range.
       *
       * @param player the player to get the statistic history for
       * @param daysAgo the amount of days to look back
       * @returns the statistic history
       */
      async function getStatisticHistory(player: ScoreSaberPlayerToken, date: Date) {
        return await PlayerHistoryService.getPlayerStatisticHistory(player, date, true, {
          rank: true,
          countryRank: true,
          pp: true,
          medals: true,
        });
      }

      const [, plusOnePp, accBadges, hmdBreakdown, medalsRank, dailyChanges, weeklyChanges, monthlyChanges] =
        await Promise.all([
          account ? PlayerCoreService.updatePeakRank(account, player) : undefined,
          account ? PlayerRankedService.getPlayerWeightedPpGainForRawPp(id) : 0,
          account ? PlayerAccuraciesService.getAccBadges(id) : {},
          // todo: cleanup this mess
          account && player !== undefined
            ? (async () => {
                const hmdUsage = await PlayerHmdService.getPlayerHmdBreakdown(id);
                const totalKnownHmdScores = Object.values(hmdUsage).reduce((sum, count) => sum + count, 0);
                return Object.fromEntries(
                  Object.entries(hmdUsage).map(([hmd, count]) => [
                    hmd,
                    totalKnownHmdScores > 0 ? (count / totalKnownHmdScores) * 100 : 0,
                  ])
                ) as Record<HMD, number>;
              })()
            : undefined,
          account ? PlayerMedalsService.getPlayerMedalRank(id) : undefined,
          account ? getPlayerStatisticChanges(await getStatisticHistory(player, getDaysAgoDate(1)), 1) : {},
          account ? getPlayerStatisticChanges(await getStatisticHistory(player, getDaysAgoDate(7)), 7) : {},
          account ? getPlayerStatisticChanges(await getStatisticHistory(player, getDaysAgoDate(30)), 30) : {},
        ]);

      return {
        ...basePlayer,
        bio: {
          lines: player.bio ? player.bio.split("\n") : [],
          linesStripped: player.bio ? player.bio.replace(/<[^>]+>/g, "").split("\n") : [],
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
        plusOnePp: plusOnePp,
        accBadges,
        peakRank: account?.peakRank,
        statistics: player.scoreStats,
        hmdBreakdown: hmdBreakdown,
        rankPages: {
          global: getPageFromRank(player.rank, 50),
          country: getPageFromRank(player.countryRank, 50),
          medals: medalsRank ? getPageFromRank(medalsRank, 50) : undefined,
        },
        rankPercentile:
          (player.rank / ((await MetricsService.getMetric(MetricType.ACTIVE_ACCOUNTS))?.value as number) || 1) * 100,
      } as ScoreSaberPlayer;
    });
  }

  /**
   * Gets a cached ScoreSaber player token. The short cache uses a seperate redis
   * key so the long-lived cache is not affected.
   *
   * @param id the player's id
   * @param useShortCache whether to use the short cache
   * @returns the player token
   */
  public static async getCachedPlayer(id: string, useShortCache: boolean = false): Promise<ScoreSaberPlayerToken> {
    const cacheKey = `scoresaber:${useShortCache ? "temp-" : ""}cached-player:${id}`;

    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      try {
        return SuperJSON.parse(cachedData) as ScoreSaberPlayerToken;
      } catch {
        Logger.warn(`Failed to parse cached player data for ${id}, removing from cache`);
        await redisClient.del(cacheKey);
      }
    }

    const player = await ApiServiceRegistry.getInstance().getScoreSaberService().lookupPlayer(id);
    if (!player) {
      throw new NotFoundError(`Player "${id}" not found`);
    }

    await redisClient.set(
      cacheKey,
      SuperJSON.stringify(player),
      "EX",
      useShortCache ? CacheService.CACHE_EXPIRY[CacheId.ScoreSaber] : CACHED_PLAYER_EXPIRY
    );
    return player;
  }

  /**
   * Update a cached ScoreSaber player token.
   *
   * @param id the player's id
   * @param player the player token to update
   */
  public static async updateCachedPlayer(
    id: string,
    player: ScoreSaberLeaderboardPlayerInfoToken | ScoreSaberPlayerToken
  ) {
    const cachedPlayer = await redisClient.get(`scoresaber:cached-player:${player.id}`);

    try {
      if (cachedPlayer && player.name && player.profilePicture && player.country) {
        const cachedPlayerData = SuperJSON.parse(cachedPlayer) as ScoreSaberPlayerToken;

        cachedPlayerData.name = player.name;
        cachedPlayerData.profilePicture = player.profilePicture;
        cachedPlayerData.country = player.country;

        await redisClient.set(
          `scoresaber:cached-player:${id}`,
          SuperJSON.stringify(cachedPlayerData),
          "EX",
          CACHED_PLAYER_EXPIRY
        );
      }
    } catch {
      Logger.warn(`Failed to update cached player data for ${id}, removing from cache`);
      await redisClient.del(`scoresaber:cached-player:${id}`);
    }
  }
}
