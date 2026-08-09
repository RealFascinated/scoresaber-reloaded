import { DetailType } from "@ssr/common/detail-type";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import { HMD } from "@ssr/common/hmds";
import Logger, { type ScopedLogger } from "@ssr/common/logger";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ScoreSaberAccount } from "@ssr/common/schemas/scoresaber/account";
import {
  ScoreSaberV2PlayerToken,
  isScoreSaberV2PlayerToken,
  type ScoreSaberPlayerLookupToken,
} from "@ssr/common/schemas/scoresaber/tokens/v2/player/player";
import { getPlayerStatisticChanges } from "@ssr/common/utils/player-utils";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { getPageFromRank } from "@ssr/common/utils/utils";
import { parse, stringify } from "devalue";
import { cachedPlayerTokenCacheKey, playerCacheKey } from "../../common/cache-keys";
import { redisClient } from "../../common/redis";
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
    player?: ScoreSaberPlayerLookupToken
  ): Promise<ScoreSaberPlayer> {
    player ??= await ScoreSaberApiService.lookupPlayer(id);
    if (!player) {
      throw new NotFoundError(`Player "${id}" not found`);
    }

    // A token passed in (e.g. from the token cache) can predate the v2 shape and
    // lack `stats`; re-resolve from the API instead of crashing on it below.
    if (!player.stats) {
      const freshPlayer = await ScoreSaberApiService.lookupPlayer(id);
      if (!freshPlayer?.stats) {
        throw new NotFoundError(`Player "${id}" not found`);
      }
      player = freshPlayer;
    }

    const rank = player.stats.rank;
    const countryRank = player.stats.countryRank;

    return CacheService.fetch(CacheId.SCORESABER_PLAYER, playerCacheKey(id, type), async () => {
      const account = await PlayerCoreService.getOrCreateAccount(id, player).catch(() => undefined);
      if (!account) {
        throw new NotFoundError(`Player account "${id}" not found`);
      }

      const basePlayer = ScoreSaberPlayerService.buildBasePlayer(player, account);

      if (type === "basic") {
        return basePlayer;
      }

      const statistics = await PlayerStatisticsService.getStatistics(player);
      const [hmdBreakdown, history] = await Promise.all([
        account && player !== undefined
          ? PlayerHmdService.getPlayerHmdBreakdown(id).then(computeHmdUsagePercentages)
          : undefined,
        PlayerHistoryService.getPlayerStatisticHistories(player, statistics, 30),
      ]);

      let rankPercentile =
        (rank / (MetricsService.getMetric<ActiveAccountsMetric>(MetricType.ACTIVE_ACCOUNTS)?.value || 1)) *
        100;
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
        peakRank: account.peakRank,
        hmdBreakdown: hmdBreakdown,
        rankPages: {
          global: getPageFromRank(rank, 50),
          country: getPageFromRank(countryRank, 50),
          medals:
            account?.medalsRank && account.medalsRank > 0
              ? getPageFromRank(account.medalsRank, 50)
              : undefined,
        },
        rankPercentile: rankPercentile,
        currentStreak: account.currentStreak,
        longestStreak: account.longestStreak,
        statistics: statistics,
      } as ScoreSaberPlayer;
    });
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
      joinedDate: "createdAt" in player ? new Date(player.createdAt) : new Date(),
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

  /**
   * Parses and validates a cached player token against the v2 schema. Entries
   * written by older code (pre-v2 shape, missing `stats`) fail validation and
   * are removed from the cache so callers re-fetch a fresh token instead of
   * consuming malformed data.
   *
   * @param cachedData the raw cached value
   * @param id the player's id
   * @returns the valid token, or undefined if the entry was unusable
   */
  private static async parseCachedPlayerToken(
    cachedData: string,
    id: string
  ): Promise<ScoreSaberV2PlayerToken | undefined> {
    let token: ScoreSaberV2PlayerToken;
    try {
      token = parse(cachedData) as ScoreSaberV2PlayerToken;
    } catch {
      ScoreSaberPlayerService.logger.warn(
        `Failed to parse cached player data for ${id}, removing from cache`
      );
      await redisClient.del(cachedPlayerTokenCacheKey(id));
      return undefined;
    }

    if (!isScoreSaberV2PlayerToken(token)) {
      ScoreSaberPlayerService.logger.warn(
        `Cached player data for ${id} does not match the v2 player schema, removing from cache`
      );
      await redisClient.del(cachedPlayerTokenCacheKey(id));
      return undefined;
    }

    return token;
  }

  /**
   * Gets a cached ScoreSaber player token.
   *
   * @param id the player's id
   * @returns the player token
   */
  public static async getCachedPlayer(id: string): Promise<ScoreSaberV2PlayerToken> {
    const cacheKey = cachedPlayerTokenCacheKey(id);

    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      const cachedToken = await ScoreSaberPlayerService.parseCachedPlayerToken(cachedData, id);
      if (cachedToken) {
        return cachedToken;
      }
    }

    const player = await ScoreSaberApiService.lookupPlayer(id);
    if (!player) {
      throw new NotFoundError(`Player "${id}" not found`);
    }

    await redisClient.set(cacheKey, stringify(player), "EX", CACHED_PLAYER_EXPIRY);
    return player;
  }

  public static async getCachedPlayers(ids: string[]): Promise<Map<string, ScoreSaberV2PlayerToken>> {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) {
      return new Map();
    }

    const keyToId = new Map<string, string>(
      uniqueIds.map(id => [cachedPlayerTokenCacheKey(id), id] as const)
    );
    const keys = [...keyToId.keys()];
    const cachedValues = await redisClient.mget(keys);
    const players = new Map<string, ScoreSaberV2PlayerToken>();
    const missingIds: string[] = [];

    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      const cachedValue = cachedValues[index];
      const id = keyToId.get(key);
      if (!id) {
        continue;
      }

      if (!cachedValue) {
        missingIds.push(id);
        continue;
      }

      const cachedToken = await ScoreSaberPlayerService.parseCachedPlayerToken(cachedValue, id);
      if (!cachedToken) {
        missingIds.push(id);
        continue;
      }

      players.set(id, cachedToken);
    }

    if (missingIds.length > 0) {
      const lookedUpPlayers = await Promise.all(
        missingIds.map(async id => {
          const player = await ScoreSaberApiService.lookupPlayer(id);
          return { id, player };
        })
      );

      await Promise.all(
        lookedUpPlayers.map(async ({ id, player }) => {
          if (!player) {
            return;
          }

          players.set(id, player);
          await redisClient.set(cachedPlayerTokenCacheKey(id), stringify(player), "EX", CACHED_PLAYER_EXPIRY);
        })
      );
    }

    return players;
  }
}
