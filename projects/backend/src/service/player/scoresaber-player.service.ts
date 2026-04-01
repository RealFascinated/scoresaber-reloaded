import { DetailType } from "@ssr/common/detail-type";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import { HMD } from "@ssr/common/hmds";
import Logger from "@ssr/common/logger";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ScoreSaberLeaderboardPlayerInfo } from "@ssr/common/schemas/scoresaber/leaderboard/player-info";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { getPlayerStatisticChanges } from "@ssr/common/utils/player-utils";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { getPageFromRank } from "@ssr/common/utils/utils";
import { parse, stringify } from "devalue";
import { cachedPlayerTokenCacheKey, playerCacheKey } from "../../common/cache-keys";
import { redisClient } from "../../common/redis";
import ActiveAccountsMetric from "../../metrics/impl/player/active-accounts";
import { ScoreSaberAccountsRepository } from "../../repositories/scoresaber-accounts.repository";
import { ScoreSaberScoresRepository } from "../../repositories/scoresaber-scores.repository";
import { ScoreSaberApiService } from "../external/scoresaber-api.service";
import CacheService, { CacheId } from "../infra/cache.service";
import MetricsService, { MetricType } from "../infra/metrics.service";
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

      // delete players scores if banned so they don't fuck up top scores
      if (player.banned) {
        await ScoreSaberScoresRepository.deleteAllByPlayerId(id);
      }

      const basePlayer = {
        id: player.id,
        name: player.name,
        avatar: account?.avatar ?? "https://cdn.fascinated.cc/assets/unknown.png",
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

      const [plusOnePp, hmdBreakdown, medalsRank, statisticHistory, rankWithInactives] = await Promise.all([
        account ? PlayerRankedService.getPlayerPlusOnePp(id) : 0,
        account && player !== undefined
          ? PlayerHmdService.getPlayerHmdBreakdown(id).then(computeHmdUsagePercentages)
          : undefined,
        account ? ScoreSaberAccountsRepository.getPlayerGlobalMedalRank(id) : undefined,
        PlayerHistoryService.getPlayerStatisticHistories(player, 30),
        account
          ? (async () => (await ScoreSaberAccountsRepository.countWithPpGreaterThan(player.pp)) + 1)()
          : 0,
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
          daily: getPlayerStatisticChanges(statisticHistory, 1),
          weekly: getPlayerStatisticChanges(statisticHistory, 7),
          monthly: getPlayerStatisticChanges(statisticHistory, 30),
        },
        plusOnePp: plusOnePp,
        peakRank: account?.peakRank,
        statistics: player.scoreStats,
        hmdBreakdown: hmdBreakdown,
        rankPages: {
          global: getPageFromRank(player.rank, 50),
          country: getPageFromRank(player.countryRank, 50),
          medals: medalsRank ? getPageFromRank(medalsRank, 50) : undefined,
        },
        rankPercentile:
          (player.rank /
            (MetricsService.getMetric<ActiveAccountsMetric>(MetricType.ACTIVE_ACCOUNTS)?.value || 1) || 1) *
          100,
        rankWithInactives,
        scoreStats: account?.scoreStats ?? undefined,
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
        Logger.warn(`Failed to parse cached player data for ${id}, removing from cache`);
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

  /**
   * Update a cached ScoreSaber player token.
   *
   * @param id the player's id
   * @param player the player token to update
   */
  public static async updateCachedPlayer(
    id: string,
    player: ScoreSaberLeaderboardPlayerInfo | ScoreSaberPlayerToken
  ) {
    const cachedPlayer = await redisClient.get(cachedPlayerTokenCacheKey(player.id));

    try {
      if (cachedPlayer && player.name && player.profilePicture && player.country) {
        const cachedPlayerData = parse(cachedPlayer) as ScoreSaberPlayerToken;

        cachedPlayerData.name = player.name;
        cachedPlayerData.profilePicture = player.profilePicture;
        cachedPlayerData.country = player.country;

        await redisClient.set(
          cachedPlayerTokenCacheKey(id),
          stringify(cachedPlayerData),
          "EX",
          CACHED_PLAYER_EXPIRY
        );
      }
    } catch {
      Logger.warn(`Failed to update cached player data for ${id}, removing from cache`);
      await redisClient.del(cachedPlayerTokenCacheKey(id));
    }
  }
}
