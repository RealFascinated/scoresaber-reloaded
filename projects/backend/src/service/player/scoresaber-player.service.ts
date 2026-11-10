import { DetailType } from "@ssr/common/detail-type";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import { HMD } from "@ssr/common/hmds";
import Logger, { type ScopedLogger } from "@ssr/common/logger";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import { ScoreSaberAccount } from "@ssr/common/schemas/scoresaber/account";
import {
  isScoreSaberV2PlayerToken,
  type ScoreSaberPlayerLookupToken,
} from "@ssr/common/schemas/scoresaber/tokens/v2/player/player";
import { getPlayerStatisticChanges } from "@ssr/common/utils/player-utils";
import { getPageFromRank } from "@ssr/common/utils/utils";
import { playerCacheKey } from "../../common/cache-keys";
import { scoreSaberAccountRowToType } from "../../db/converter/scoresaber-account";
import ActiveAccountsMetric from "../../metrics/impl/player/active-accounts";
import { ScoreSaberAccountsRepository } from "../../repositories/scoresaber-accounts.repository";
import { ScoreSaberApiService } from "../external/scoresaber-api.service";
import CacheService, { CacheId } from "../infra/cache.service";
import MetricsService, { MetricType } from "../infra/metrics.service";
import { PlayerStatisticsService } from "../player-statistics/player-statistics.service";
import { PlayerCoreService } from "./player-core.service";
import { PlayerHistoryService } from "./player-history.service";
import { PlayerHmdService } from "./player-hmd.service";

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
   * The built player is cached "live-ish": a cache hit never calls ScoreSaber, and the entry only
   * goes away through {@link PlayerCoreService.invalidatePlayerCaches}.
   *
   * @param id the player's account id
   * @param type how much detail to include
   * @param player a token freshly looked up from ScoreSaber (e.g. from a ranking page); it must be
   * resolved for the realm. The player is rebuilt from it and the cache refreshed, never served from cache.
   * @param realmId the realm to resolve the player's rank, pp and statistics for
   * @returns the player
   */
  public static async getPlayer(
    id: string,
    type: DetailType = "basic",
    player?: ScoreSaberPlayerLookupToken,
    realmId: number = DEFAULT_REALM_ID
  ): Promise<ScoreSaberPlayer> {
    const cacheKey = playerCacheKey(id, type, realmId);

    if (player !== undefined) {
      const built = await ScoreSaberPlayerService.buildPlayer(id, type, player, realmId);
      try {
        await CacheService.insert(CacheId.SCORESABER_PLAYER, cacheKey, built);
      } catch (error) {
        ScoreSaberPlayerService.logger.warn(`Failed to cache player "${id}":`, error);
      }
      return built;
    }

    return CacheService.fetch(CacheId.SCORESABER_PLAYER, cacheKey, async () => {
      const token = await ScoreSaberApiService.lookupPlayer(id, realmId, { fresh: true });
      if (!token) {
        throw new NotFoundError(`Player "${id}" not found`);
      }
      return ScoreSaberPlayerService.buildPlayer(id, type, token, realmId);
    });
  }

  /**
   * Builds a player from a ScoreSaber token and the tracked data.
   *
   * @param id the player's account id
   * @param type how much detail to include
   * @param player the token to build from
   * @param realmId the realm to resolve the player's rank, pp and statistics for
   */
  private static async buildPlayer(
    id: string,
    type: DetailType,
    player: ScoreSaberPlayerLookupToken,
    realmId: number
  ): Promise<ScoreSaberPlayer> {
    // A token passed in can predate the v2 shape and lack `stats`; re-resolve from the API
    // instead of crashing on it below.
    if (!player.stats) {
      const freshPlayer = await ScoreSaberApiService.lookupPlayer(id, realmId, { fresh: true });
      if (!freshPlayer?.stats) {
        throw new NotFoundError(`Player "${id}" not found`);
      }
      player = freshPlayer;
    }

    const rank = player.stats.rank;
    const countryRank = player.stats.countryRank;

    const account = await PlayerCoreService.getOrCreateAccount(id, player).catch(() => undefined);
    if (!account) {
      throw new NotFoundError(`Player account "${id}" not found`);
    }

    const basePlayer = ScoreSaberPlayerService.buildBasePlayer(player, account);

    if (type === "basic") {
      return basePlayer;
    }

    const statistics = await PlayerStatisticsService.getStatistics(player, realmId);
    const [hmdBreakdown, history] = await Promise.all([
      PlayerHmdService.getPlayerHmdBreakdown(id).then(computeHmdUsagePercentages),
      PlayerHistoryService.getPlayerStatisticHistories(player, statistics, 30, realmId),
    ]);

    let rankPercentile =
      (rank / (MetricsService.getMetric<ActiveAccountsMetric>(MetricType.ACTIVE_ACCOUNTS)?.value || 1)) * 100;
    if (isNaN(rankPercentile)) {
      rankPercentile = 0;
    }

    return {
      ...basePlayer,
      badges:
        ("badges" in player && player.badges
          ? player.badges.map(badge => ({
              url: badge.image,
              description: badge.description,
            }))
          : []) || [],
      statisticChange: {
        daily: getPlayerStatisticChanges(history, 1),
        weekly: getPlayerStatisticChanges(history, 7),
        monthly: getPlayerStatisticChanges(history, 30),
      },
      plusOnePp: statistics.plusOnePp,
      // The peak rank is only tracked for the default realm.
      peakRank: realmId === DEFAULT_REALM_ID ? account.peakRank : undefined,
      hmdBreakdown: hmdBreakdown,
      rankPages: {
        global: getPageFromRank(rank, 50),
        country: getPageFromRank(countryRank, 50),
        medals:
          account.medalsRank && account.medalsRank > 0 ? getPageFromRank(account.medalsRank, 50) : undefined,
      },
      rankPercentile: rankPercentile,
      currentStreak: account.currentStreak,
      longestStreak: account.longestStreak,
      statistics: statistics,
    } as ScoreSaberPlayer;
  }

  /**
   * Caches the basic player built from a fresh token, so profiles stay live without a ScoreSaber call.
   *
   * @param token a token freshly looked up from ScoreSaber, resolved for the realm
   * @param account the up-to-date tracked account of the player
   * @param realmId the realm the token was resolved for
   */
  public static async cacheBasicPlayer(
    token: ScoreSaberPlayerLookupToken,
    account: ScoreSaberAccount,
    realmId: number = DEFAULT_REALM_ID
  ): Promise<void> {
    try {
      await CacheService.insert(
        CacheId.SCORESABER_PLAYER,
        playerCacheKey(token.id, "basic", realmId),
        ScoreSaberPlayerService.buildBasePlayer(token, account)
      );
    } catch (error) {
      ScoreSaberPlayerService.logger.warn(`Failed to cache player "${token.id}":`, error);
    }
  }

  /**
   * Builds the base (basic-type) ScoreSaberPlayer object shared by all detail
   * types, from the player token and the tracked account row.
   */
  private static buildBasePlayer(
    player: ScoreSaberPlayerLookupToken,
    account: ScoreSaberAccount
  ): ScoreSaberPlayer {
    return {
      id: player.id,
      name: player.name,
      avatar: account.avatar,
      country: player.country,
      rank: player.stats.rank,
      countryRank: player.stats.countryRank,
      pp: player.stats.totalPP,
      medals: account.medals,
      medalsRank: account.medalsRank,
      medalsCountryRank: account.medalsCountryRank,
      hmd: account.hmd,
      role: player.role,
      permissions: player.permissions,
      banned: player.banned,
      inactive: player.inactive,
      trackedSince: account.trackedSince,
      // Page tokens carry no creation date, so fall back to the tracked one
      joinedDate: "createdAt" in player ? new Date(player.createdAt) : account.joinedDate,
    } as ScoreSaberPlayer;
  }

  /**
   * Resolves basic player objects for a batch of player tokens using a single
   * batched account lookup, instead of one DB query per player.
   *
   * Players without a tracked account are created using the provided token
   * (matching getPlayer's behavior); page tokens that cannot be created are
   * skipped.
   */
  public static async getBasicPlayers(players: ScoreSaberPlayerLookupToken[]): Promise<ScoreSaberPlayer[]> {
    if (players.length === 0) {
      return [];
    }
    const uniquePlayers = [...new Map(players.map(player => [player.id, player])).values()];
    const accountRows = await ScoreSaberAccountsRepository.findManyByIds(
      uniquePlayers.map(player => player.id)
    );
    const accountsById = new Map(accountRows.map(row => [row.id, scoreSaberAccountRowToType(row)]));

    const result: ScoreSaberPlayer[] = [];
    for (const player of uniquePlayers) {
      let account = accountsById.get(player.id);
      if (!account) {
        if (!isScoreSaberV2PlayerToken(player)) {
          continue; // page tokens do not carry the full profile needed to create an account
        }
        account = await PlayerCoreService.createPlayer(player.id, player);
        if (!account) {
          continue;
        }
      }
      result.push(ScoreSaberPlayerService.buildBasePlayer(player, account));
    }
    return result;
  }
}
