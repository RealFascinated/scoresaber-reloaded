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
import {
  PlayerScoreChartDataPoint,
  PlayerScoresChartResponse,
} from "@ssr/common/response/player-scores-chart";
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
    create: boolean = false,
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
      if (!create) {
        throw new NotFoundError(`Player "${id}" not found, create disabled`);
      }

      const success = await this.trackPlayer(id, playerToken);
      if (!success) {
        throw new NotFoundError(`Player "${id}" not found`);
      }

      player = await PlayerModel.findOne({ _id: id });
      if (!player) {
        throw new NotFoundError(`Player "${id}" not found after creation`);
      }
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
            trackedSince: new Date(),
          });
          await newPlayer.save();

          // Add to the seed queue
          QueueManager.getQueue(QueueId.PlayerScoreSeed).add(id);

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
    await PlayerService.ensurePlayerExists(playerId);

    // Use aggregation to get sorted PPs directly from database
    const sortedPps = await ScoreService.getPlayerScores(playerId, {
      ranked: true,
      sort: "pp",
      projection: { pp: 1 },
      includeLeaderboard: false,
    }).then(scores => scores.map(score => score.score.pp));

    if (sortedPps.length === 0) {
      return [0];
    }

    // Calculate all boundaries in a single pass
    const boundaries: number[] = [];
    for (let i = 1; i <= boundary; i++) {
      boundaries.push(
        ApiServiceRegistry.getInstance().getScoreSaberService().calcPpBoundary(sortedPps, i)
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
    const foundPlayer = await PlayerService.getPlayer(playerId, true);
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
    const result = await ScoreService.getPlayerScores(playerId, {
      projection: {
        accuracy: 1,
        pp: 1,
      },
      includeLeaderboard: false,
    });

    // Filter out any scores with invalid accuracy values
    const validScores = result.filter(
      playerScore =>
        Number.isFinite(playerScore.score.accuracy) &&
        playerScore.score.accuracy >= 0 &&
        playerScore.score.accuracy <= 100
    );

    if (validScores.length === 0) {
      return accuracies;
    }

    // Calculate averages in a single pass
    let unrankedScores = 0;
    let unrankedAccuracySum = 0;
    let totalAccuracySum = 0;

    for (const playerScore of validScores) {
      const accuracy = playerScore.score.accuracy;
      totalAccuracySum += accuracy;

      if (playerScore.score.pp === 0) {
        unrankedAccuracySum += accuracy;
        unrankedScores++;
      }
    }

    // Calculate averages, defaulting to 0 if no scores in category
    accuracies.unrankedAccuracy = unrankedScores > 0 ? unrankedAccuracySum / unrankedScores : 0;
    accuracies.averageAccuracy = validScores.length > 0 ? totalAccuracySum / validScores.length : 0;

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

    // Process scores in a single pass
    for (const playerScore of playerScores) {
      const accuracy = playerScore.score.accuracy;
      if (accuracy >= 95) {
        badges.SSPlus++;
      } else if (accuracy >= 90) {
        badges.SS++;
      } else if (accuracy >= 85) {
        badges.SPlus++;
      } else if (accuracy >= 80) {
        badges.S++;
      } else if (accuracy >= 70) {
        badges.A++;
      }
    }

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

    const data: PlayerScoreChartDataPoint[] = [];
    for (const playerScore of playerScores) {
      const leaderboard = playerScore.leaderboard as ScoreSaberLeaderboard;
      const score = playerScore.score as ScoreSaberScore;

      data.push({
        accuracy: score.accuracy,
        stars: leaderboard.stars,
        pp: score.pp,
        timestamp: score.timestamp,
        leaderboardId: leaderboard.id + "",
        leaderboardName: leaderboard.fullName,
        leaderboardDifficulty: getDifficultyName(getDifficulty(leaderboard.difficulty.difficulty)),
      });
    }

    return {
      data,
    };
  }

  /**
   * Gets the player's most common recent HMD.
   *
   * @param playerId the player's id
   * @returns the player's most common recent HMD
   */
  public static async getPlayerMostCommonRecentHmd(playerId: string): Promise<string | undefined> {
    const hmds = await ScoreSaberScoreModel.aggregate([
      { $match: { playerId: playerId } }, // get all scores for the player
      { $sort: { timestamp: -1 } }, // sort by timestamp descending
      { $match: { hmd: { $ne: "Unknown" } } }, // filter out scores with unknown hmd
      { $limit: 50 }, // get the last 50 scores
      { $group: { _id: "$hmd", count: { $sum: 1 } } }, // group by hmd and count the number of scores
      { $sort: { count: -1 } }, // sort by count descending (most common first)
      { $limit: 1 }, // get the most common hmd
    ]);

    return hmds[0]?._id ?? undefined;
  }

  /**
   * Updates the player's HMD.
   *
   * @param playerId the player's id
   * @param hmd the player's HMD
   */
  public static async updatePlayerHmd(playerId: string, hmd: string): Promise<void> {
    await PlayerModel.updateOne({ _id: playerId }, { $set: { hmd } });
  }
}
