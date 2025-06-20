import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { InternalServerError } from "@ssr/common/error/internal-server-error";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger from "@ssr/common/logger";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { PlayerDocument, PlayerModel } from "@ssr/common/model/player";
import { PlayerHistoryEntryModel } from "@ssr/common/model/player/player-history-entry";
import {
  ScoreSaberScore,
  ScoreSaberScoreModel,
} from "@ssr/common/model/score/impl/scoresaber-score";
import { AccBadges } from "@ssr/common/player/acc-badges";
import { PlayerAccuracies } from "@ssr/common/player/player-accuracies";
import { PlayerRankedPpsResponse } from "@ssr/common/response/player-ranked-pps-response";
import { PlayerScoresChartResponse } from "@ssr/common/response/player-scores-chart";
import { ScoreCalendarData } from "@ssr/common/types/player/player-statistic";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import { isProduction } from "@ssr/common/utils/utils";
import { fetchWithCache } from "../../common/cache.util";
import { logNewTrackedPlayer } from "../../common/embds";
import { QueueId, QueueManager } from "../../queue/queue-manager";
import CacheService, { ServiceCache } from "../cache.service";
import { ScoreService } from "../score/score.service";

const accountCreationLock: { [id: string]: Promise<PlayerDocument> } = {};

export class PlayerService {
  /**
   * Gets a player by id.
   *
   * @param id the player's id
   * @param create whether to create the player if it doesn't exist
   * @param playerToken an optional player token
   * @returns the player document if found
   * @throws NotFoundError if the player doesn't exist and create is false
   */
  public static async getPlayer(
    id: string,
    playerToken?: ScoreSaberPlayerToken
  ): Promise<PlayerDocument> {
    // Wait for the existing lock if it's in progress
    if (accountCreationLock[id] !== undefined) {
      return await accountCreationLock[id];
    }

    let player: PlayerDocument | null = await fetchWithCache(
      CacheService.getCache(ServiceCache.Players),
      `player:${id}`,
      async () => PlayerModel.findOne({ _id: id })
    );

    if (player === null) {
      const success = await this.trackPlayer(id, playerToken);
      if (!success) {
        throw new NotFoundError(`Player "${id}" not found`);
      }

      player = await PlayerModel.findOne({ _id: id });
      if (!player) {
        throw new NotFoundError(`Player "${id}" not found after creation`);
      }
    }

    let shouldSave = false; // Whether to save the player

    if (playerToken) {
      // Update the player's name if it's different from the token
      if (playerToken.name !== player.name) {
        player.name = playerToken.name;
        shouldSave = true;
      }

      // Update the players pp if it's different from the token
      if (playerToken.pp !== player.pp) {
        player.pp = playerToken.pp;
        shouldSave = true;
      }
    }

    if (shouldSave) {
      await player.save();
    }

    return player;
  }

  /**
   * Checks if a player exists.
   *
   * @param id the player's id
   * @returns whether the player exists
   */
  public static async playerExists(id: string, throwIfNotFound: boolean = false): Promise<boolean> {
    const player = await PlayerModel.exists({ _id: id });
    if (throwIfNotFound && !player) {
      throw new NotFoundError(`Player "${id}" not found`);
    }
    return player !== null;
  }

  /**
   * Tracks a player.
   *
   * @param id the player's id
   * @param playerToken an optional player token
   * @returns whether the player was successfully tracked
   */
  public static async trackPlayer(
    id: string,
    playerToken?: ScoreSaberPlayerToken
  ): Promise<boolean> {
    try {
      if (await this.playerExists(id)) {
        return true;
      }

      playerToken =
        playerToken ||
        (await ApiServiceRegistry.getInstance().getScoreSaberService().lookupPlayer(id));
      if (!playerToken) {
        return false;
      }

      // Create a new lock promise and assign it
      accountCreationLock[id] = (async () => {
        try {
          Logger.info(`Creating player "${id}"...`);
          const newPlayer = await PlayerModel.create({
            _id: id,
            joinedDate: new Date(playerToken.firstSeen),
            inactive: playerToken.inactive,
            name: playerToken.name,
            trackedSince: new Date(),
          });
          await newPlayer.save();

          // Add to the seed queue
          QueueManager.getQueue(QueueId.PlayerScoreRefreshQueue).add(id);

          // Notify in production
          if (isProduction()) {
            await logNewTrackedPlayer(playerToken);
          }
          return newPlayer;
        } catch (err) {
          Logger.error(`Failed to create player document for "${id}"`, err);
          throw new InternalServerError(`Failed to create player document for "${id}"`);
        } finally {
          // Ensure the lock is always removed
          delete accountCreationLock[id];
        }
      })();

      // Wait for the player creation to complete
      await accountCreationLock[id];
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
    if (!(await PlayerService.playerExists(playerId))) {
      throw new NotFoundError(`Player "${playerId}" not found`);
    }
  }

  /**
   * Gets a player's HMD.
   *
   * @param id the player's id
   * @returns the player's HMD
   */
  public static async getPlayerHMD(id: string): Promise<string | undefined> {
    const player = await PlayerModel.findById(id).select("hmd").lean();
    return player?.hmd;
  }

  /**
   * Generates score calendar data for a specific year and month.
   */
  public static async generateScoreCalendar(
    playerId: string,
    year: number,
    month: number
  ): Promise<ScoreCalendarData> {
    await PlayerService.playerExists(playerId, true); // throws if player doesn't exist

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const entries = await PlayerHistoryEntryModel.find({
      playerId: playerId,
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    });

    const days: Record<number, { rankedMaps: number; unrankedMaps: number; totalMaps: number }> =
      {};
    const metadata: Record<number, number[]> = {};

    for (const entry of entries) {
      const date = entry.date;
      const statYear = date.getFullYear();
      const statMonth = date.getMonth() + 1;

      if (
        !entry.rankedScores ||
        !entry.unrankedScores ||
        typeof entry.rankedScores !== "number" ||
        typeof entry.unrankedScores !== "number"
      ) {
        continue;
      }

      if (!metadata[statYear]) {
        metadata[statYear] = [];
      }
      if (!metadata[statYear].includes(statMonth)) {
        metadata[statYear].push(statMonth);
      }

      if (statYear === year && statMonth === month) {
        const rankedScores = entry.rankedScores ?? 0;
        const unrankedScores = entry.unrankedScores ?? 0;

        days[date.getDate()] = {
          rankedMaps: rankedScores,
          unrankedMaps: unrankedScores,
          totalMaps: rankedScores + unrankedScores,
        };
      }
    }

    // Sort months in metadata
    for (const [year, months] of Object.entries(metadata)) {
      metadata[Number(year)] = months.sort();
    }

    return { days, metadata };
  }

  /**
   * Gets the ranked pp scores for a player.
   *
   * @param playerId the player's id
   * @returns the ranked pp scores
   */
  public static async getPlayerRankedPps(playerId: string): Promise<PlayerRankedPpsResponse> {
    await PlayerService.ensurePlayerExists(playerId);

    const playerScores = await ScoreService.getPlayerScores(playerId, {
      ranked: true,
      sort: "pp",
      projection: { pp: 1, scoreId: 1 },
      includeLeaderboard: false,
    });

    if (playerScores.length === 0) {
      return {
        scores: [],
      };
    }

    const scores = playerScores.map(score => ({
      pp: score.score.pp,
      scoreId: score.score.scoreId,
    }));

    return {
      scores,
    };
  }

  /**
   * Gets the pp boundary for a player.
   *
   * @param playerId the player's id
   * @param boundary the pp boundary
   */
  public static async getPlayerPpBoundary(
    playerId: string,
    boundary: number = 1
  ): Promise<number[]> {
    // Use aggregation to calculate boundaries directly in database
    const result = await ScoreSaberScoreModel.aggregate([
      // Match ranked scores for the player
      {
        $match: {
          playerId: playerId,
          pp: { $gt: 0 },
        },
      },
      // Sort by pp in descending order
      {
        $sort: { pp: -1 },
      },
      // Group to get the array of PPs
      {
        $group: {
          _id: null,
          pps: { $push: "$pp" },
        },
      },
    ]);

    if (!result.length || !result[0].pps.length) {
      return [0];
    }

    // Calculate all boundaries in a single pass
    const boundaries: number[] = [];
    for (let i = 1; i <= boundary; i++) {
      boundaries.push(
        ApiServiceRegistry.getInstance().getScoreSaberService().calcPpBoundary(result[0].pps, i)
      );
    }

    return boundaries;
  }

  /**
   * Gets the pp boundary amount for a pp value.
   *
   * @param playerId the player's id
   * @param boundary the pp boundary
   */
  public static async getPlayerPpBoundaryFromScorePp(
    playerId: string,
    boundary: number = 1
  ): Promise<number> {
    await PlayerService.ensurePlayerExists(playerId);
    const scoresPps = await this.getPlayerRankedPps(playerId);
    if (scoresPps.scores.length === 0) {
      return 0;
    }

    return ApiServiceRegistry.getInstance()
      .getScoreSaberService()
      .getPpBoundaryForRawPp(
        scoresPps.scores.map(score => score.pp),
        boundary
      );
  }

  /**
   * Updates the player's peak rank.
   *
   * @param playerId the player's id
   * @param playerToken the player's token
   */
  public static async updatePeakRank(playerId: string, playerToken: ScoreSaberPlayerToken) {
    const foundPlayer = await PlayerService.getPlayer(playerId);
    if (playerToken.rank == 0) {
      return foundPlayer;
    }

    if (
      !foundPlayer.peakRank ||
      (foundPlayer.peakRank && playerToken.rank < foundPlayer.peakRank.rank)
    ) {
      foundPlayer.peakRank = {
        rank: playerToken.rank,
        date: new Date(),
      };
      foundPlayer.markModified("peakRank");
    }
    await foundPlayer.save();
    return foundPlayer;
  }

  /**
   * Gets the player's average accuracies.
   *
   * @param playerId the player's id
   * @returns the player's accuracy
   */
  public static async getPlayerAverageAccuracies(playerId: string): Promise<PlayerAccuracies> {
    const accuracies = {
      unrankedAccuracy: 0,
      averageAccuracy: 0,
    };

    // Use aggregation to calculate averages in the database
    const result = await ScoreSaberScoreModel.aggregate([
      // Match scores for the player with valid accuracy values
      {
        $match: {
          playerId: playerId,
          accuracy: { $gte: 0, $lte: 100 },
        },
      },
      // Group and calculate averages
      {
        $facet: {
          // Calculate average for all scores
          totalStats: [
            {
              $group: {
                _id: null,
                totalAccuracy: { $sum: "$accuracy" },
                count: { $sum: 1 },
              },
            },
          ],
          // Calculate average for unranked scores (pp = 0)
          unrankedStats: [
            {
              $match: { pp: 0 },
            },
            {
              $group: {
                _id: null,
                totalAccuracy: { $sum: "$accuracy" },
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    if (result.length > 0) {
      const { totalStats, unrankedStats } = result[0];

      // Calculate total average accuracy
      if (totalStats.length > 0) {
        accuracies.averageAccuracy = totalStats[0].totalAccuracy / totalStats[0].count;
      }

      // Calculate unranked average accuracy
      if (unrankedStats.length > 0) {
        accuracies.unrankedAccuracy = unrankedStats[0].totalAccuracy / unrankedStats[0].count;
      }
    }

    return accuracies;
  }

  /**
   * Gets the acc badges for a player.
   *
   * @param playerId the player's id
   * @returns the acc badges
   */
  public static async getAccBadges(playerId: string): Promise<AccBadges> {
    const badges: AccBadges = {
      SSPlus: 0,
      SS: 0,
      SPlus: 0,
      S: 0,
      A: 0,
    };

    // Use aggregation to get only ranked scores with accuracy
    const playerScores = await ScoreService.getPlayerScores(playerId, {
      ranked: true,
      projection: {
        accuracy: 1,
      },
      includeLeaderboard: false,
    });

    // Process scores in parallel using Promise.all
    const badgeCounts = await Promise.all(
      playerScores.map(async playerScore => {
        const accuracy = playerScore.score.accuracy;
        if (accuracy >= 95) return { SSPlus: 1, SS: 0, SPlus: 0, S: 0, A: 0 };
        if (accuracy >= 90) return { SSPlus: 0, SS: 1, SPlus: 0, S: 0, A: 0 };
        if (accuracy >= 85) return { SSPlus: 0, SS: 0, SPlus: 1, S: 0, A: 0 };
        if (accuracy >= 80) return { SSPlus: 0, SS: 0, SPlus: 0, S: 1, A: 0 };
        if (accuracy >= 70) return { SSPlus: 0, SS: 0, SPlus: 0, S: 0, A: 1 };
        return { SSPlus: 0, SS: 0, SPlus: 0, S: 0, A: 0 };
      })
    );

    // Aggregate results
    badgeCounts.forEach(count => {
      badges.SSPlus += count.SSPlus;
      badges.SS += count.SS;
      badges.SPlus += count.SPlus;
      badges.S += count.S;
      badges.A += count.A;
    });

    return badges;
  }

  /**
   * Gets the player's score chart data.
   *
   * @param playerId the player's id
   */
  public static async getPlayerScoreChart(playerId: string): Promise<PlayerScoresChartResponse> {
    const playerScores = await ScoreService.getPlayerScores(playerId, {
      includeLeaderboard: true,
      ranked: true,
      projection: {
        accuracy: 1,
        pp: 1,
        timestamp: 1,
      },
    });

    // Process data points in parallel using Promise.all
    const data = await Promise.all(
      playerScores.map(async playerScore => {
        const leaderboard = playerScore.leaderboard as ScoreSaberLeaderboard;
        const score = playerScore.score as ScoreSaberScore;

        return {
          accuracy: score.accuracy,
          stars: leaderboard.stars,
          pp: score.pp,
          timestamp: score.timestamp,
          leaderboardId: leaderboard.id + "",
          leaderboardName: leaderboard.fullName,
          leaderboardDifficulty: getDifficultyName(
            getDifficulty(leaderboard.difficulty.difficulty)
          ),
        };
      })
    );

    return {
      data,
    };
  }

  /**
   * Gets the hmd usage from the current day.
   *
   * @returns the hmd usage
   */
  public static async getActiveHmdUsage(): Promise<Record<string, number>> {
    const hmdUsage = await PlayerModel.aggregate([
      {
        $match: {
          hmd: { $nin: ["Unknown", null] },
          inactive: false,
        },
      },
      { $group: { _id: "$hmd", count: { $sum: 1 } } },
      { $project: { _id: 0, hmd: "$_id", count: 1 } },
    ]).then(results => Object.fromEntries(results.map(r => [r.hmd, r.count])));

    return hmdUsage;
  }

  /**
   * Updates the player's name.
   *
   * @param playerId the player's id
   * @param name the new name
   */
  public static async updatePlayerName(playerId: string, name: string) {
    await PlayerModel.updateOne({ _id: playerId }, { $set: { name } });
  }
}
