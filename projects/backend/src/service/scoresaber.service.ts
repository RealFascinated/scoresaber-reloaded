import { fetchWithCache } from "../common/cache.util";
import CacheService, { ServiceCache } from "./cache.service";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { NotFoundError } from "elysia";
import ScoreSaberPlayer, { ScoreSaberBadge, ScoreSaberBio } from "@ssr/common/player/impl/scoresaber-player";
import sanitize from "sanitize-html";
import { PlayerHistory } from "@ssr/common/player/player-history";
import { PlayerDocument } from "@ssr/common/model/player";
import { PlayerService } from "./player.service";
import { formatDateMinimal, getDaysAgoDate, getMidnightAlignedDate } from "@ssr/common/utils/time-utils";
import { getPageFromRank } from "@ssr/common/utils/utils";
import { getValueFromHistory } from "@ssr/common/utils/player-utils";

export default class ScoreSaberService {
  /**
   * Gets a ScoreSaber player using their account id.
   *
   * @param id the player's account id
   * @param createIfMissing creates the player if they don't have an account with us
   * @returns the player
   */
  public static async getPlayer(id: string, createIfMissing?: boolean): Promise<ScoreSaberPlayer> {
    return fetchWithCache<ScoreSaberPlayer>(
      CacheService.getCache(ServiceCache.ScoreSaber),
      `player:${id}`,
      async () => {
        const playerToken = await scoresaberService.lookupPlayer(id);
        if (!playerToken) {
          throw new NotFoundError(`Player "${id}" not found`);
        }
        let account: PlayerDocument | undefined;
        try {
          account = await PlayerService.getPlayer(id, createIfMissing, playerToken);
        } catch {
          // ignore
        }

        const bio: ScoreSaberBio = {
          lines: playerToken.bio ? sanitize(playerToken.bio).split("\n") : [],
          linesStripped: playerToken.bio ? sanitize(playerToken.bio.replace(/<[^>]+>/g, "")).split("\n") : [], // strips html tags
        };
        const badges: ScoreSaberBadge[] =
          playerToken.badges?.map(badge => {
            return {
              url: badge.image,
              description: badge.description,
            };
          }) || [];

        let statisticHistory: Record<string, PlayerHistory> = account?.getHistoryPreviousDays(50) || {};
        if (statisticHistory) {
          const todayDate = formatDateMinimal(getMidnightAlignedDate(new Date()));
          const historyElement = statisticHistory[todayDate];
          statisticHistory[todayDate] = {
            ...historyElement,
            rank: playerToken.rank,
            countryRank: playerToken.countryRank,
            pp: playerToken.pp,
            ...(account ? { plusOnePp: (await PlayerService.getPlayerPpBoundary(account.id, 1))[0] } : undefined),
            replaysWatched: playerToken.scoreStats.replaysWatched,
            accuracy: {
              ...historyElement?.accuracy,
              averageRankedAccuracy: playerToken.scoreStats.averageRankedAccuracy,
            },
            scores: {
              rankedScores: 0,
              unrankedScores: 0,
              ...historyElement?.scores,
              totalScores: playerToken.scoreStats.totalPlayCount,
              totalRankedScores: playerToken.scoreStats.rankedPlayCount,
            },
            score: {
              ...historyElement?.score,
              totalScore: playerToken.scoreStats.totalScore,
              totalRankedScore: playerToken.scoreStats.totalRankedScore,
            },
          };
        }

        const playerRankHistory = playerToken.histories.split(",").map(value => {
          return parseInt(value);
        });
        playerRankHistory.push(playerToken.rank);

        let daysAgo = 0; // Start from current day
        for (let i = playerRankHistory.length; i >= 0; i--) {
          const rank = playerRankHistory[i];
          if (rank == 999_999) {
            continue;
          }

          const date = getMidnightAlignedDate(getDaysAgoDate(daysAgo));
          daysAgo += 1;

          const dateKey = formatDateMinimal(date);
          if (!statisticHistory[dateKey] || statisticHistory[dateKey].rank == undefined) {
            statisticHistory[dateKey] = {
              ...statisticHistory[dateKey],
              rank: rank,
            };
          }
        }

        // sort statisticHistory by date
        statisticHistory = Object.fromEntries(
          Object.entries(statisticHistory).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
        );

        for (const [date, history] of Object.entries(statisticHistory)) {
          if (history.plusOnePp) {
            history.plusOnePp = Math.round(history.plusOnePp * Math.pow(10, 2)) / Math.pow(10, 2);
            statisticHistory[date] = history;
          }
        }

        return {
          id: playerToken.id,
          name: playerToken.name,
          avatar: playerToken.profilePicture,
          country: playerToken.country,
          rank: playerToken.rank,
          countryRank: playerToken.countryRank,
          avatarColor: "#fff",
          hmd: await PlayerService.getPlayerHMD(playerToken.id),
          // avatarColor: (await ImageService.getAverageImageColor(playerToken.profilePicture))?.color,
          joinedDate: new Date(playerToken.firstSeen),
          bio: bio,
          pp: playerToken.pp,
          statisticChange: {
            daily: account ? await this.getStatisticChanges(statisticHistory, 1) : {},
            weekly: account ? await this.getStatisticChanges(statisticHistory, 7) : {},
            monthly: account ? await this.getStatisticChanges(statisticHistory, 30) : {},
          },
          role: playerToken.role == null ? undefined : playerToken.role,
          badges: badges,
          statisticHistory: statisticHistory,
          statistics: playerToken.scoreStats,
          rankPages: {
            global: getPageFromRank(playerToken.rank, 50),
            country: getPageFromRank(playerToken.countryRank, 50),
          },
          peakRank: account ? account.peakRank : undefined,
          permissions: playerToken.permissions,
          banned: playerToken.banned,
          inactive: playerToken.inactive,
          isBeingTracked: account !== undefined,
        } as ScoreSaberPlayer;
      }
    );
  }

  /**
   * Gets the statistic change of a player
   *
   * @param history the player's history
   * @param statType the statistic type
   * @param isNegativeChange whether the change should be negative
   * @param daysAgo the amount of days to look back
   * @returns the statistic change
   * @private
   */
  private static getStatisticChange(
    history: Record<string, PlayerHistory>,
    statType: string,
    isNegativeChange: boolean,
    daysAgo: number = 1
  ): number | undefined {
    const todayDate = formatDateMinimal(getMidnightAlignedDate(new Date()));
    const todayStats = history[todayDate];

    // Ensure todayStats exists and contains the statType
    const statToday = todayStats ? getValueFromHistory(todayStats, statType) : undefined;
    if (statToday === undefined) {
      return undefined;
    }

    let otherDate: Date | undefined;
    let statOther: number | undefined;

    // Optimize `daysAgo === 1` case by avoiding unnecessary computations
    if (daysAgo === 1) {
      otherDate = getMidnightAlignedDate(getDaysAgoDate(1)); // Yesterday
      const otherStats = history[formatDateMinimal(otherDate)];
      statOther = otherStats ? getValueFromHistory(otherStats, statType) : undefined;
    } else {
      const targetDate = getDaysAgoDate(daysAgo);

      // Retrieve a list of dates only once, sorted for easier access
      const sortedDates = Object.keys(history).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

      // Use binary search to efficiently find the closest date to `targetDate`
      let closestDate: Date | undefined;
      let minDiff = Number.POSITIVE_INFINITY;

      for (const dateKey of sortedDates) {
        const date = new Date(dateKey);
        const diff = Math.abs(date.getTime() - targetDate.getTime());

        // Skip future dates
        if (date.getTime() >= new Date().getTime()) break;

        const statsForDate = history[dateKey];
        if (statType in statsForDate && diff < minDiff) {
          minDiff = diff;
          closestDate = date;
        }
      }

      // If we found a closest valid date, use it
      if (closestDate) {
        otherDate = closestDate;
        const otherStats = history[formatDateMinimal(otherDate)];
        statOther = otherStats ? getValueFromHistory(otherStats, statType) : undefined;
      }
    }

    // Return if no valid `otherStats` or `statOther` was found
    if (statOther === undefined) {
      return undefined;
    }

    // Calculate change and apply the `isNegativeChange` modifier
    return (statToday - statOther) * (isNegativeChange ? -1 : 1);
  }

  /**
   * Gets the changes in the players statistic history
   *
   * @param history the player's history
   * @param daysAgo the amount of days to look back
   * @returns the statistic changes
   * @private
   */
  private static async getStatisticChanges(
    history: Record<string, PlayerHistory>,
    daysAgo: number = 1
  ): Promise<PlayerHistory> {
    return {
      rank: this.getStatisticChange(history, "rank", true, daysAgo),
      countryRank: this.getStatisticChange(history, "countryRank", true, daysAgo),
      pp: this.getStatisticChange(history, "pp", false, daysAgo),
    };
  }
}
