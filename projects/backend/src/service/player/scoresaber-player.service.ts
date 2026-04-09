import { DetailType } from "@ssr/common/detail-type";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import { HMD } from "@ssr/common/hmds";
import Logger, { type ScopedLogger } from "@ssr/common/logger";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { getPlayerStatisticChanges } from "@ssr/common/utils/player-utils";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { getPageFromRank } from "@ssr/common/utils/utils";
import { parse, stringify } from "devalue";
import { cachedPlayerTokenCacheKey, playerCacheKey } from "../../common/cache-keys";
import { redisClient } from "../../common/redis";
import ActiveAccountsMetric from "../../metrics/impl/player/active-accounts";
import { ScoreSaberApiService } from "../external/scoresaber-api.service";
import CacheService, { CacheId } from "../infra/cache.service";
import MetricsService, { MetricType } from "../infra/metrics.service";
import { PlayerStatisticsService } from "../player-statistics/player-statistics.service";
import { PlayerCoreService } from "./player-core.service";
import { PlayerHistoryService } from "./player-history.service";
import { PlayerHmdService } from "./player-hmd.service";
import { PlayerRankedService } from "./player-ranked.service";

const CACHED_PLAYER_EXPIRY = TimeUnit.toSeconds(TimeUnit.Month, 3);

function computeHmdUsagePercentages(hmdUsage: Record<HMD, number>): Record<HMD, number> {
  const totalKnownHmdScores = Object.values(hmdUsage).reduce((sum, c) => sum + c, 0);
  return Object.fromEntries(
    Object.entries(hmdUsage).map(([hmd, c]) => [
      hmd,
      totalKnownHmdScores > 0 ? (c / totalKnownHmdScores) * 100 : 0,
    ])
  ) as Record<HMD, number>;
}

export default class ScoreSaberPlayerService {
  private static readonly logger: ScopedLogger = Logger.withTopic("ScoreSaber Player");

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
    player ??= await ScoreSaberApiService.lookupPlayer(id);
    if (!player) {
      throw new NotFoundError(`Player "${id}" not found`);
    }

    return CacheService.fetch(CacheId.SCORESABER_PLAYER, playerCacheKey(id, type), async () => {
      const account = await PlayerCoreService.getOrCreateAccount(id, player).catch(() => undefined);

      const basePlayer = {
        id: player.id,
        name: player.name,
        avatar: account?.avatar ?? "https://cdn.fascinated.cc/assets/unknown.png",
        country: player.country,
        rank: player.rank,
        countryRank: player.countryRank,
        pp: player.pp,
        medals: account?.medals ?? 0,
        medalsRank: account?.medalsRank ?? 0,
        medalsCountryRank: account?.medalsCountryRank ?? 0,
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

      const statistics = await PlayerStatisticsService.getPlayerStatistics(player, true);
      const [plusOnePp, hmdBreakdown, history] = await Promise.all([
        account ? PlayerRankedService.getPlayerPlusOnePp(id) : 0,
        account && player !== undefined
          ? PlayerHmdService.getPlayerHmdBreakdown(id).then(computeHmdUsagePercentages)
          : undefined,
        PlayerHistoryService.getPlayerStatisticHistories(player, statistics, 30),
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
          daily: getPlayerStatisticChanges(history, 1),
          weekly: getPlayerStatisticChanges(history, 7),
          monthly: getPlayerStatisticChanges(history, 30),
        },
        plusOnePp: plusOnePp,
        peakRank: account?.peakRank,
        hmdBreakdown: hmdBreakdown,
        rankPages: {
          global: getPageFromRank(player.rank, 50),
          country: getPageFromRank(player.countryRank, 50),
          medals:
            account?.medalsRank && account.medalsRank > 0
              ? getPageFromRank(account.medalsRank, 50)
              : undefined,
        },
        rankPercentile:
          (player.rank /
            (MetricsService.getMetric<ActiveAccountsMetric>(MetricType.ACTIVE_ACCOUNTS)?.value || 1) || 1) *
          100,
        currentStreak: account?.currentStreak ?? 0,
        longestStreak: account?.longestStreak ?? 0,
        statistics: statistics,
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
  public static async getCachedPlayer(id: string): Promise<ScoreSaberPlayerToken> {
    const cacheKey = cachedPlayerTokenCacheKey(id);

    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      try {
        return parse(cachedData) as ScoreSaberPlayerToken;
      } catch {
        ScoreSaberPlayerService.logger.warn(
          `Failed to parse cached player data for ${id}, removing from cache`
        );
        await redisClient.del(cacheKey);
      }
    }

    const player = await ScoreSaberApiService.lookupPlayer(id);
    if (!player) {
      throw new NotFoundError(`Player "${id}" not found`);
    }

    await redisClient.set(cacheKey, stringify(player), "EX", CACHED_PLAYER_EXPIRY);
    return player;
  }
}
