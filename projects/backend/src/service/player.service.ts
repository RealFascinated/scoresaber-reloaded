import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { CooldownPriority } from "@ssr/common/cooldown";
import { DetailType } from "@ssr/common/detail-type";
import { InternalServerError } from "@ssr/common/error/internal-server-error";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger from "@ssr/common/logger";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { Player, PlayerModel } from "@ssr/common/model/player";
import {
  PlayerHistoryEntry,
  PlayerHistoryEntryModel,
} from "@ssr/common/model/player/player-history-entry";
import {
  ScoreSaberScore,
  ScoreSaberScoreModel,
} from "@ssr/common/model/score/impl/scoresaber-score";
import { removeObjectFields } from "@ssr/common/object.util";
import { AccBadges } from "@ssr/common/player/acc-badges";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerAccuracies } from "@ssr/common/player/player-accuracies";
import { PlayerStatisticHistory } from "@ssr/common/player/player-statistic-history";
import { PlayerRankedPpsResponse } from "@ssr/common/response/player-ranked-pps-response";
import { PlayerScoresChartResponse } from "@ssr/common/response/player-scores-chart";
import {
  getScoreSaberLeaderboardFromToken,
  getScoreSaberScoreFromToken,
} from "@ssr/common/token-creators";
import { ScoreCalendarData } from "@ssr/common/types/player/player-statistic";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { parseRankHistory } from "@ssr/common/utils/player-utils";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import {
  formatDateMinimal,
  formatDuration,
  getDaysAgoDate,
  getMidnightAlignedDate,
  isToday,
} from "@ssr/common/utils/time-utils";
import { isProduction } from "@ssr/common/utils/utils";
import { EmbedBuilder } from "discord.js";
import { DiscordChannels, logToChannel } from "../bot/bot";
import { logNewTrackedPlayer } from "../common/embds";
import { QueueId, QueueManager } from "../queue/queue-manager";
import CacheService, { CacheId } from "./cache.service";
import { ScoreService } from "./score/score.service";
import ScoreSaberService from "./scoresaber/scoresaber.service";

const accountCreationLock: { [id: string]: Promise<Player> } = {};

const PLAYER_REFRESH_CONCURRENT_PAGE_FETCH_COUNT = 3;
type PlayerRefreshResult = {
  missingScores: number;
  totalScores: number;
  totalPages: number;
  timeTaken: number;
};

const INACTIVE_RANK = 999_999;

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
  public static async getPlayer(id: string, playerToken?: ScoreSaberPlayerToken): Promise<Player> {
    // Wait for the existing lock if it's in progress
    if (accountCreationLock[id] !== undefined) {
      return await accountCreationLock[id];
    }

    let player: Player | null = await CacheService.fetchWithCache(
      CacheId.Players,
      `player:${id}`,
      async () => PlayerModel.findOne({ _id: id }).lean()
    );

    if (player === null) {
      const success = await this.trackPlayer(id, playerToken);
      if (!success) {
        throw new NotFoundError(`Player "${id}" not found`);
      }

      player = await PlayerModel.findOne({ _id: id }).lean();
      if (!player) {
        throw new NotFoundError(`Player "${id}" not found after creation`);
      }
    }

    let shouldSave = false; // Whether to save the player
    const updates: Partial<Player> = {};

    if (playerToken) {
      // Update the player's name if it's different from the token
      if (playerToken.name !== player.name) {
        updates.name = playerToken.name;
        shouldSave = true;
      }

      // Update the players pp if it's different from the token
      if (playerToken.pp !== player.pp) {
        updates.pp = playerToken.pp;
        shouldSave = true;
      }
    }

    if (shouldSave) {
      await PlayerModel.updateOne({ _id: id }, { $set: updates });
      // Update the local player object with the new values
      Object.assign(player, updates);
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

          // Add to the seed queue
          QueueManager.getQueue(QueueId.PlayerScoreRefreshQueue).add(id);

          // Notify in production
          if (isProduction()) {
            await logNewTrackedPlayer(playerToken);
          }
          return newPlayer.toObject();
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
      const newPeakRank = {
        rank: playerToken.rank,
        date: new Date(),
      };

      await PlayerModel.updateOne({ _id: playerId }, { $set: { peakRank: newPeakRank } });

      // Update the local player object
      foundPlayer.peakRank = newPeakRank;
    }

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

  /**
   * Searches for players by name.
   *
   * @param query the query to search for
   * @returns the players that match the query
   */
  public static async searchPlayers(query: string): Promise<ScoreSaberPlayer[]> {
    // Run ScoreSaber API call and database query in parallel
    const [scoreSaberResponse, foundPlayers] = await Promise.all([
      ApiServiceRegistry.getInstance().getScoreSaberService().searchPlayers(query),
      query.length > 0
        ? PlayerModel.find({
            name: { $regex: query, $options: "i" },
          }).select(["_id", "name"])
        : [],
    ]);

    const scoreSaberPlayerTokens = scoreSaberResponse?.players;

    // Merge their ids
    const playerIds = foundPlayers.map(player => player._id);
    playerIds.push(...(scoreSaberPlayerTokens?.map(token => token.id) ?? []));

    // Deduplicate the player ids
    const uniquePlayerIds = [...new Set(playerIds)];

    // Get players from ScoreSaber
    return (
      await Promise.all(
        uniquePlayerIds.map(id =>
          ScoreSaberService.getPlayer(
            id,
            DetailType.BASIC,
            scoreSaberPlayerTokens?.find(token => token.id === id)
          )
        )
      )
    ).sort((a, b) => {
      if (a.inactive && !b.inactive) return 1;
      if (!a.inactive && b.inactive) return -1;
      return a.rank - b.rank;
    });
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

  /**
   * Refreshes all scores for a player.
   *
   * @param player the player to refresh scores for
   * @param playerToken the player's token
   * @returns the result of the refresh
   */
  public static async refreshAllPlayerScores(
    player: Player,
    playerToken: ScoreSaberPlayerToken
  ): Promise<PlayerRefreshResult> {
    Logger.info(`Refreshing scores for ${player._id}...`);
    const startTime = performance.now();

    const result: PlayerRefreshResult = {
      missingScores: 0,
      totalScores: 0,
      totalPages: 0,
      timeTaken: 0,
    };

    // First, get the first page to determine total pages
    const firstPage = await ApiServiceRegistry.getInstance()
      .getScoreSaberService()
      .lookupPlayerScores({
        playerId: player._id,
        page: 1,
        limit: 100,
        sort: "recent",
        priority: CooldownPriority.BACKGROUND,
      });

    if (!firstPage) {
      Logger.info(`No scores found for player ${player._id}`);

      // Mark player as seeded
      if (!player.seededScores) {
        await PlayerModel.updateOne({ _id: player._id }, { $set: { seededScores: true } });
      }

      result.timeTaken = performance.now() - startTime;
      return result;
    }

    const totalPages = Math.ceil(firstPage.metadata.total / 100);
    Logger.info(`Found ${totalPages} total pages for ${player._id}`);

    // Process the first page
    for (const score of firstPage.playerScores) {
      const leaderboard = getScoreSaberLeaderboardFromToken(score.leaderboard);

      const { tracked } = await ScoreService.trackScoreSaberScore(
        getScoreSaberScoreFromToken(score.score, leaderboard, player._id),
        leaderboard,
        playerToken,
        true,
        false
      );
      if (tracked) {
        result.missingScores++;
      }
      result.totalScores++;
    }

    // Process remaining pages
    for (let page = 2; page <= totalPages; page++) {
      Logger.info(`Processing page ${page} for ${player._id}...`);

      const scoresPage = await ApiServiceRegistry.getInstance()
        .getScoreSaberService()
        .lookupPlayerScores({
          playerId: player._id,
          page: page,
          limit: 100,
          sort: "recent",
          priority: CooldownPriority.BACKGROUND,
        });

      if (!scoresPage) {
        Logger.warn(`Failed to fetch scores for ${player._id} on page ${page}.`);
        continue;
      }

      for (const score of scoresPage.playerScores) {
        const leaderboard = getScoreSaberLeaderboardFromToken(score.leaderboard);
        const { tracked } = await ScoreService.trackScoreSaberScore(
          getScoreSaberScoreFromToken(score.score, leaderboard, player._id),
          leaderboard,
          playerToken,
          true,
          false
        );
        if (tracked) {
          result.missingScores++;
        }
        result.totalScores++;
      }

      Logger.info(`Completed page ${page} for ${player._id}`);
    }

    // Mark player as seeded
    if (!player.seededScores) {
      await PlayerModel.updateOne({ _id: player._id }, { $set: { seededScores: true } });
    }

    result.totalPages = totalPages;
    result.timeTaken = performance.now() - startTime;
    Logger.info(
      `Finished refreshing scores for ${player._id}, total pages refreshed: ${totalPages} in ${formatDuration(result.timeTaken)}`
    );
    return result;
  }

  /**
   * Updates the player statistics for all players.
   *
   * @param callback the callback that gets called when a page is fetched
   */
  public static async updatePlayerStatistics(
    callback?: (
      currentPage: number,
      totalPages: number,
      successCount: number,
      errorCount: number
    ) => void
  ) {
    const now = new Date();
    Logger.info("Starting player statistics update...");

    const firstPage = await ApiServiceRegistry.getInstance()
      .getScoreSaberService()
      .lookupPlayers(1);
    if (firstPage == undefined) {
      Logger.error("Failed to fetch players on page 1, skipping player statistics update...");
      return;
    }

    const pages = Math.ceil(firstPage.metadata.total / (firstPage.metadata.itemsPerPage ?? 100));
    Logger.info(`Fetching ${pages} pages of players from ScoreSaber...`);

    const PLAYER_TIMEOUT = 30000;
    let successCount = 0;
    let errorCount = 0;

    const playerIds = new Set<string>();

    // Process pages in batches
    for (
      let batchStart = 1;
      batchStart <= pages;
      batchStart += PLAYER_REFRESH_CONCURRENT_PAGE_FETCH_COUNT
    ) {
      const batchEnd = Math.min(batchStart + PLAYER_REFRESH_CONCURRENT_PAGE_FETCH_COUNT - 1, pages);
      Logger.info(`Processing pages ${batchStart} to ${batchEnd} concurrently...`);

      const batchPromises = [];
      for (let i = batchStart; i <= batchEnd; i++) {
        batchPromises.push(
          (async () => {
            Logger.info(`Fetching page ${i}...`);
            const page = await ApiServiceRegistry.getInstance()
              .getScoreSaberService()
              .lookupPlayers(i);

            if (page == undefined) {
              Logger.error(`Failed to fetch players on page ${i}, skipping page...`);
              errorCount++;
              return;
            }

            callback?.(i, pages, successCount, errorCount);
            Logger.info(`Processing page ${i} with ${page.players.length} players...`);

            await Promise.all(
              page.players.map(async player => {
                // Add player ids to the list
                if (playerIds.has(player.id)) {
                  return;
                }
                playerIds.add(player.id);

                let timeoutId: NodeJS.Timeout | undefined;
                try {
                  const timeoutPromise = new Promise((_, reject) => {
                    timeoutId = setTimeout(
                      () => reject(new Error(`Timeout processing player ${player.id}`)),
                      PLAYER_TIMEOUT
                    );
                  });

                  const processPromise = (async () => {
                    const foundPlayer = await PlayerService.getPlayer(player.id, player);
                    await PlayerService.trackPlayerHistory(foundPlayer, now, player);

                    // Get the total amount of scores tracked for this player
                    const trackedScores = await ScoreSaberScoreModel.countDocuments({
                      playerId: player.id,
                    });

                    // If the player has less scores tracked than the total play count, add them to the refresh queue
                    if (trackedScores < player.scoreStats.totalPlayCount) {
                      Logger.info(
                        `Player ${player.id} has missing scores. Adding them to the refresh queue...`
                      );
                      // Add the player to the refresh queue
                      QueueManager.getQueue(QueueId.PlayerScoreRefreshQueue).add(player.id);
                    }

                    successCount++;
                  })();

                  await Promise.race([processPromise, timeoutPromise]);
                } catch (error) {
                  Logger.error(
                    `Failed to track seeded player ${player.id} (${player.name}): ${error}`
                  );
                  errorCount++;
                } finally {
                  if (timeoutId) {
                    clearTimeout(timeoutId);
                  }
                }
              })
            );

            Logger.info(`Completed page ${i}`);
          })()
        );
      }

      // Wait for all pages in the current batch to complete
      await Promise.all(batchPromises);
      Logger.info(`Completed batch ${batchStart} to ${batchEnd}`);
    }

    // Log the number of active players found
    Logger.info(`Found ${playerIds.size} active players from ScoreSaber API`);

    // Get all player IDs from database
    const allPlayerIds = await PlayerModel.find({}, { _id: 1 });
    Logger.info(`Total players in database: ${allPlayerIds.length}`);

    // Mark players not in the active list as inactive
    for (const { _id } of allPlayerIds) {
      if (!playerIds.has(_id)) {
        await PlayerModel.updateOne({ _id }, { $set: { inactive: true } });
        Logger.info(`Marked player ${_id} as inactive`);
      }
    }

    const inactivePlayers = await PlayerModel.countDocuments({ inactive: true });

    logToChannel(
      DiscordChannels.BACKEND_LOGS,
      new EmbedBuilder()
        .setTitle(`Refreshed ${successCount} players.`)
        .setDescription(
          [
            `Successfully processed: ${successCount} players`,
            `Failed to process: ${errorCount} players`,
            `Inactive players: ${inactivePlayers}`,
          ].join("\n")
        )
        .setColor("#00ff00")
    );
    Logger.info(
      `Finished tracking player statistics in ${(performance.now() - now.getTime()).toFixed(0)}ms\n` +
        `Successfully processed: ${successCount} players\n` +
        `Failed to process: ${errorCount} players\n` +
        `Total inactive players: ${inactivePlayers}`
    );
  }

  /**
   * Tracks and updates a player's statistics for a specific date.
   * This method handles both new and existing players, updating their statistics
   * and handling inactive status.
   */
  public static async trackPlayerHistory(
    foundPlayer: Player,
    trackTime: Date,
    playerToken?: ScoreSaberPlayerToken
  ): Promise<void> {
    const before = performance.now();
    const player =
      playerToken ??
      (await ApiServiceRegistry.getInstance().getScoreSaberService().lookupPlayer(foundPlayer._id));

    if (!player) {
      Logger.warn(`Player "${foundPlayer._id}" not found on ScoreSaber`);
      return;
    }

    if (foundPlayer.inactive !== player.inactive) {
      await PlayerModel.updateOne(
        { _id: foundPlayer._id },
        { $set: { inactive: player.inactive } }
      );
      foundPlayer.inactive = player.inactive;
    }

    if (player.inactive) {
      Logger.info(`Player "${foundPlayer._id}" is inactive on ScoreSaber`);
      return;
    }

    const daysTracked = await this.getDaysTracked(foundPlayer._id);
    if (daysTracked === 0) {
      await this.seedPlayerHistory(foundPlayer, player);
    }

    if (foundPlayer.seededScores) {
      const existingEntry = await PlayerHistoryEntryModel.findOne({
        playerId: foundPlayer._id,
        date: getMidnightAlignedDate(trackTime),
      }).lean();

      const updatedHistory = await this.createPlayerStatistic(player, existingEntry ?? undefined);

      await PlayerHistoryEntryModel.findOneAndUpdate(
        { playerId: foundPlayer._id, date: getMidnightAlignedDate(trackTime) },
        updatedHistory,
        { upsert: true }
      );
    }

    await PlayerModel.updateOne({ _id: foundPlayer._id }, { $set: { lastTracked: new Date() } });
    foundPlayer.lastTracked = new Date();

    Logger.info(
      `Tracked player "${foundPlayer._id}" in ${(performance.now() - before).toFixed(0)}ms`
    );
  }

  /**
   * Gets a player's statistic history for a specific date range.
   */
  public static async getPlayerStatisticHistory(
    player: ScoreSaberPlayerToken,
    startDate: Date,
    endDate: Date,
    projection?: Record<string, string | number | boolean | object>
  ): Promise<PlayerStatisticHistory> {
    const startTimestamp = getMidnightAlignedDate(startDate).getTime();
    const endTimestamp = getMidnightAlignedDate(endDate).getTime();

    const isRangeIncludesToday = isToday(startDate) || isToday(endDate);

    // Ensure start date is before end date
    const [queryStart, queryEnd] =
      startTimestamp > endTimestamp
        ? [endTimestamp, startTimestamp]
        : [startTimestamp, endTimestamp];

    // Run queries in parallel
    const [entries, playerRankHistory] = await Promise.all([
      PlayerHistoryEntryModel.find({
        playerId: player.id,
        date: {
          $gte: new Date(queryStart),
          $lte: new Date(queryEnd),
        },
      })
        .select(projection ? { date: 1, ...projection } : {})
        .sort({ date: -1 })
        .lean(),
      parseRankHistory(player),
    ]);

    const history: PlayerStatisticHistory = {};
    for (const entry of entries) {
      const date = formatDateMinimal(entry.date);
      history[date] = this.playerHistoryToObject(entry);
    }

    // Process rank history in parallel chunks
    const daysDiff =
      Math.abs(Math.ceil((endTimestamp - startTimestamp) / (1000 * 60 * 60 * 24))) + 1;
    let daysAgo = 0;

    for (
      let i = playerRankHistory.length - 1;
      i >= Math.max(0, playerRankHistory.length - daysDiff - 1);
      i--
    ) {
      const rank = playerRankHistory[i];
      if (rank === INACTIVE_RANK || rank === 0) continue;

      const date = getMidnightAlignedDate(getDaysAgoDate(daysAgo));
      daysAgo += 1;

      const dateKey = formatDateMinimal(date);
      if (!history[dateKey] || history[dateKey].rank === undefined) {
        history[dateKey] = { rank };
      }
    }

    // Handle today's data if the range includes today
    if (isRangeIncludesToday) {
      const today = getMidnightAlignedDate(new Date());
      const todayKey = formatDateMinimal(today);

      // Get today's data from database or generate fresh
      const todayData = await this.getTodayPlayerStatistic(player, todayKey, projection);
      if (todayData) {
        history[todayKey] = todayData;
      }
    }

    // Sort history by date
    return Object.fromEntries(
      Object.entries(history).sort((a, b) => {
        const dateA = new Date(a[0]);
        const dateB = new Date(b[0]);
        return dateB.getTime() - dateA.getTime();
      })
    );
  }

  /**
   * Gets today's player statistics, either from database or generates fresh data.
   */
  private static async getTodayPlayerStatistic(
    player: ScoreSaberPlayerToken,
    todayKey: string,
    projection?: Record<string, string | number | boolean | object>
  ): Promise<Partial<PlayerHistoryEntry> | undefined> {
    const today = getMidnightAlignedDate(new Date());

    // Try to get existing data from database
    const existingEntry = await PlayerHistoryEntryModel.findOne({
      playerId: player.id,
      date: today,
    }).lean();

    // Generate fresh data, merging with existing if available
    const todayData = await this.createPlayerStatistic(player, existingEntry ?? undefined);

    return projection && Object.keys(projection).length > 0
      ? Object.fromEntries(Object.entries(todayData).filter(([key]) => key in projection))
      : todayData;
  }

  /**
   * Seeds a player's history with data from ScoreSaber API.
   * This method populates the player's rank history from their ScoreSaber profile.
   */
  public static async seedPlayerHistory(
    player: Player,
    playerToken: ScoreSaberPlayerToken
  ): Promise<void> {
    const playerRankHistory = parseRankHistory(playerToken);
    let daysAgo = 0;

    for (let i = playerRankHistory.length - daysAgo; i >= 0; i--) {
      const rank = playerRankHistory[i];
      if (rank === INACTIVE_RANK || rank === 0) continue;

      const date = getMidnightAlignedDate(getDaysAgoDate(daysAgo));
      await PlayerHistoryEntryModel.findOneAndUpdate(
        { playerId: player._id, date },
        { rank },
        { upsert: true }
      );
      daysAgo += 1;
    }
  }

  /**
   * Creates a new player statistic object from ScoreSaber data and existing history.
   */
  private static async createPlayerStatistic(
    playerToken: ScoreSaberPlayerToken,
    existingEntry?: Partial<PlayerHistoryEntry>
  ): Promise<Partial<PlayerHistoryEntry>> {
    const [accuracies, plusOnePp] = await Promise.all([
      PlayerService.getPlayerAverageAccuracies(playerToken.id),
      PlayerService.getPlayerPpBoundary(playerToken.id, 1),
    ]);

    return {
      pp: playerToken.pp,
      countryRank: playerToken.countryRank,
      rank: playerToken.rank,
      averageRankedAccuracy: playerToken.scoreStats.averageRankedAccuracy,
      averageUnrankedAccuracy: accuracies.unrankedAccuracy,
      averageAccuracy: accuracies.averageAccuracy,
      rankedScores: existingEntry?.rankedScores ?? 0,
      unrankedScores: existingEntry?.unrankedScores ?? 0,
      rankedScoresImproved: existingEntry?.rankedScoresImproved ?? 0,
      unrankedScoresImproved: existingEntry?.unrankedScoresImproved ?? 0,
      totalScores: playerToken.scoreStats.totalPlayCount,
      totalRankedScores: playerToken.scoreStats.rankedPlayCount,
      totalScore: playerToken.scoreStats.totalScore,
      totalRankedScore: playerToken.scoreStats.totalRankedScore,
      plusOnePp: plusOnePp[0],
    };
  }

  /**
   * Converts a database player history entry to a PlayerHistoryEntry.
   *
   * @param history the player history entry to convert
   * @returns the converted player history entry
   * @private
   */
  private static playerHistoryToObject(history: PlayerHistoryEntry): PlayerHistoryEntry {
    return {
      ...removeObjectFields<PlayerHistoryEntry>(history, ["_id", "__v", "playerId", "date"]),
    } as PlayerHistoryEntry;
  }

  /**
   * Gets the number of days tracked for a player.
   */
  private static async getDaysTracked(playerId: string): Promise<number> {
    return await PlayerHistoryEntryModel.countDocuments({ playerId });
  }
}
