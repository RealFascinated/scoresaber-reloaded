import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger from "@ssr/common/logger";
import { PlayerDocument, PlayerModel } from "@ssr/common/model/player";
import { PlayerAccuracies } from "@ssr/common/player/player-accuracies";
import { PlayerStatisticHistory } from "@ssr/common/player/player-statistic-history";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { getScoreSaberLeaderboardFromToken } from "@ssr/common/token-creators";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import ScoreSaberPlayerScoreToken from "@ssr/common/types/token/scoresaber/player-score";
import {
  formatDateMinimal,
  getDaysAgoDate,
  getMidnightAlignedDate,
} from "@ssr/common/utils/time-utils";
import { fetchWithCache } from "../../common/cache.util";
import CacheService, { ServiceCache } from "../cache.service";
import { PlayerAccuracyService } from "./player-accuracy.service";

export class PlayerHistoryService {
  /**
   * Seeds the player's history using data from
   * the ScoreSaber API.
   *
   * @param player the player to seed
   * @param playerToken the SoreSaber player token
   */
  public static async seedPlayerHistory(
    player: PlayerDocument,
    playerToken: ScoreSaberPlayerToken
  ): Promise<void> {
    // Loop through rankHistory in reverse, from current day backwards
    const playerRankHistory = playerToken.histories.split(",").map((value: string) => {
      return parseInt(value);
    });
    playerRankHistory.push(playerToken.rank);

    let daysAgo = 0; // Start from today
    for (let i = playerRankHistory.length - daysAgo; i >= 0; i--) {
      const rank = playerRankHistory[i];
      // Skip inactive days
      if (rank == 999_999) {
        continue;
      }

      const date = getMidnightAlignedDate(getDaysAgoDate(daysAgo));
      player.setStatisticHistory(date, {
        rank: rank,
      });
      daysAgo += 1; // Increment daysAgo for each earlier rank
    }
    player.markModified("statisticHistory");
    await player.save();
  }

  /**
   * Tracks a players statistics
   *
   * @param foundPlayer the player to track
   * @param trackTime the date to track the player's statistics for
   *                  (used so all players have the same track date)
   * @param playerToken an optional player token
   */
  public static async trackScoreSaberPlayer(
    foundPlayer: PlayerDocument,
    trackTime: Date,
    playerToken?: ScoreSaberPlayerToken
  ): Promise<void> {
    const before = performance.now();
    const player = playerToken ? playerToken : await scoresaberService.lookupPlayer(foundPlayer.id);
    if (player == undefined) {
      Logger.warn(`Player "${foundPlayer.id}" not found on ScoreSaber`);
      return;
    }

    if (player && foundPlayer.inactive !== player.inactive) {
      foundPlayer.inactive = player.inactive;
      await foundPlayer.save();
    }

    if (player.inactive) {
      Logger.info(`Player "${foundPlayer.id}" is inactive on ScoreSaber`);
      return;
    }

    // Seed the history with ScoreSaber data if no history exists
    if (foundPlayer.getDaysTracked() === 0) {
      await this.seedPlayerHistory(foundPlayer, player);
    }

    // Only update the history if the player has seeded scores
    if (foundPlayer.seededScores) {
      // Update current day's statistics
      let history = foundPlayer.getHistoryByDate(trackTime);
      if (history == undefined) {
        history = {}; // Initialize if history is not found
      }

      const scoreStats = player.scoreStats;
      const accuracies = await PlayerAccuracyService.getPlayerAverageAccuracies(foundPlayer.id);

      // Set the history data
      history.pp = player.pp;
      history.countryRank = player.countryRank;
      history.rank = player.rank;
      history.accuracy = {
        ...history.accuracy,
        averageRankedAccuracy: scoreStats.averageRankedAccuracy,
        averageUnrankedAccuracy: accuracies.unrankedAccuracy,
        averageAccuracy: accuracies.averageAccuracy,
      };
      history.scores = {
        rankedScores: 0,
        unrankedScores: 0,
        ...history.scores,
        totalScores: scoreStats.totalPlayCount,
        totalRankedScores: scoreStats.rankedPlayCount,
      };
      history.score = {
        ...history.score,
        totalScore: scoreStats.totalScore,
        totalRankedScore: scoreStats.totalRankedScore,
      };

      foundPlayer.setStatisticHistory(trackTime, history);
      foundPlayer.sortStatisticHistory();
      foundPlayer.markModified("statisticHistory");
    }

    foundPlayer.lastTracked = new Date();

    await foundPlayer.save();
    Logger.info(
      `Tracked player "${foundPlayer.id}" in ${(performance.now() - before).toFixed(0)}ms`
    );
  }

  /**
   * Gets the player's statistic history.
   *
   * @param player the player
   * @param account the account
   * @param accuracies the accuracies
   * @param startDate the start date
   * @param endDate the end date
   */
  public static async getPlayerStatisticHistory(
    player: ScoreSaberPlayerToken,
    account: PlayerDocument | undefined,
    accuracies: PlayerAccuracies,
    startDate: Date,
    endDate: Date
  ): Promise<PlayerStatisticHistory> {
    let history: PlayerStatisticHistory =
      account !== undefined ? account.getStatisticHistoryInRange(endDate, startDate) : {};

    if (history) {
      const todayDate = formatDateMinimal(getMidnightAlignedDate(new Date()));
      const historyElement = history[todayDate];

      history[todayDate] = {
        ...historyElement,
        rank: player.rank,
        ...(account
          ? {
              countryRank: player.countryRank,
              pp: player.pp,
              replaysWatched: player.scoreStats.replaysWatched,
              accuracy: {
                ...historyElement?.accuracy,
                averageRankedAccuracy: player.scoreStats.averageRankedAccuracy,
                averageUnrankedAccuracy: accuracies.unrankedAccuracy,
                averageAccuracy: accuracies.averageAccuracy,
              },
              scores: {
                rankedScores: 0,
                unrankedScores: 0,
                ...historyElement?.scores,
                totalScores: player.scoreStats.totalPlayCount,
                totalRankedScores: player.scoreStats.rankedPlayCount,
              },
              score: {
                ...historyElement?.score,
                totalScore: player.scoreStats.totalScore,
                totalRankedScore: player.scoreStats.totalRankedScore,
              },
            }
          : undefined),
      };
    }

    const playerRankHistory = player.histories.split(",").map(value => {
      return parseInt(value);
    });
    playerRankHistory.push(player.rank);

    const daysDiff = Math.ceil((startDate.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
    let daysAgo = 0;

    for (
      let i = playerRankHistory.length - 1;
      i >= Math.max(0, playerRankHistory.length - daysDiff - 1);
      i--
    ) {
      const rank = playerRankHistory[i];
      if (rank == 999_999) {
        continue;
      }

      const date = getMidnightAlignedDate(getDaysAgoDate(daysAgo));
      daysAgo += 1;

      const dateKey = formatDateMinimal(date);
      if (!history[dateKey] || history[dateKey].rank == undefined) {
        history[dateKey] = {
          ...(account ? history[dateKey] : undefined),
          rank: rank,
        };
      }
    }

    // sort statisticHistory by date
    history = Object.fromEntries(
      Object.entries(history).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
    );

    if (account !== undefined) {
      for (const [date, statistic] of Object.entries(history)) {
        if (statistic.plusOnePp) {
          statistic.plusOnePp = Math.round(statistic.plusOnePp * Math.pow(10, 2)) / Math.pow(10, 2); // Round to 2 decimal places
          history[date] = statistic;
        }
      }
    }

    return history;
  }

  /**
   * Updates the players set scores count for today.
   *
   * @param score the score
   */
  public static async updatePlayerScoresSet({
    score: scoreToken,
    leaderboard: leaderboardToken,
  }: ScoreSaberPlayerScoreToken) {
    const playerId = scoreToken.leaderboardPlayerInfo.id;

    const leaderboard = getScoreSaberLeaderboardFromToken(leaderboardToken);
    const player: PlayerDocument | null = await PlayerModel.findById(playerId);
    // Player is not tracked, so ignore the score.
    if (player == undefined) {
      return;
    }

    const today = new Date();
    const history = player.getHistoryByDate(today);
    const scores = history.scores || {
      rankedScores: 0,
      unrankedScores: 0,
    };
    if (leaderboard.stars > 0) {
      scores.rankedScores!++;
    } else {
      scores.unrankedScores!++;
    }

    history.scores = scores;
    player.setStatisticHistory(today, history);
    player.markModified("statisticHistory");
    await player.save();
  }

  /**
   * Gets the player's score calendar for a specific year and month.
   *
   * @param id the player's id
   * @param year the year
   * @param month the month
   */
  public static async getScoreCalendar(id: string, year: number, month: number) {
    const player = await PlayerModel.findById(id);
    if (!player) {
      throw new NotFoundError(`Player "${id}" not found`);
    }

    return fetchWithCache(
      CacheService.getCache(ServiceCache.ScoreCalendar),
      `score-calendar:${id}-${year}-${month}`,
      async () => {
        const history = player.getStatisticHistory();

        const days: Record<
          number,
          { rankedMaps: number; unrankedMaps: number; totalMaps: number }
        > = {};
        const metadata: Record<number, number[]> = {};

        for (const [dateStr, stat] of Object.entries(history)) {
          const date = new Date(dateStr);
          const statYear = date.getFullYear();
          const statMonth = date.getMonth() + 1;
          if (
            stat === undefined ||
            stat.scores === undefined ||
            stat.scores.rankedScores === undefined ||
            stat.scores.unrankedScores === undefined
          ) {
            continue;
          }

          if (
            metadata[date.getFullYear()] === undefined ||
            !metadata[date.getFullYear()].includes(statMonth)
          ) {
            if (metadata[date.getFullYear()] === undefined) {
              metadata[date.getFullYear()] = [];
            }
            metadata[date.getFullYear()].push(statMonth);
          }

          if (statYear === year && statMonth === month) {
            days[date.getDate()] = {
              rankedMaps: stat.scores.rankedScores,
              unrankedMaps: stat.scores.unrankedScores,
              totalMaps: stat.scores.rankedScores + stat.scores.unrankedScores,
            };
          }
        }

        // Sort the metadata months
        for (const [year, months] of Object.entries(metadata)) {
          metadata[Number(year)] = months.sort();
        }

        return {
          days,
          metadata,
        };
      }
    );
  }
}
