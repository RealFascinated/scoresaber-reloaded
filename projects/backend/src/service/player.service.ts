import { InternalServerError } from "@ssr/common/error/internal-server-error";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import { HMD } from "@ssr/common/hmds";
import Logger from "@ssr/common/logger";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { PlayerDocument, PlayerModel } from "@ssr/common/model/player";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { AccBadges } from "@ssr/common/player/acc-badges";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerAccuracies } from "@ssr/common/player/player-accuracies";
import { PlayerStatisticHistory } from "@ssr/common/player/player-statistic-history";
import {
  PlayedMapsCalendarResponse,
  PlayedMapsCalendarStat,
} from "@ssr/common/response/played-maps-calendar-response";
import {
  PlayerScoreChartDataPoint,
  PlayerScoresChartResponse,
} from "@ssr/common/response/player-scores-chart";
import { ScoreSort } from "@ssr/common/score/score-sort";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { getScoreSaberLeaderboardFromToken } from "@ssr/common/token-creators";
import { AroundPlayer } from "@ssr/common/types/around-player";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import ScoreSaberPlayerScoreToken from "@ssr/common/types/token/scoresaber/player-score";
import {
  getDifficulty,
  getDifficultyName,
  getScoreBadgeFromAccuracy,
} from "@ssr/common/utils/song-utils";
import {
  formatDateMinimal,
  getDaysAgoDate,
  getMidnightAlignedDate,
} from "@ssr/common/utils/time-utils";
import { isProduction } from "@ssr/common/utils/utils";
import { fetchWithCache } from "../common/cache.util";
import { logNewTrackedPlayer } from "../common/embds";
import CacheService, { ServiceCache } from "./cache.service";
import { ScoreService } from "./score/score.service";
import ScoreSaberService from "./scoresaber.service";
import { PlayerRankedPpsResponse } from "@ssr/common/response/player-ranked-pps-response";
import { updateScoreWeights } from "@ssr/common/utils/scoresaber.util";

const accountCreationLock: { [id: string]: Promise<PlayerDocument> } = {};

export class PlayerService {
  /**
   * Gets a player by id.
   *
   * @param id the player's id
   * @param create whether to create the player if it doesn't exist
   * @param playerToken an optional player token
   */
  public static async getPlayer(
    id: string,
    create: boolean = false,
    playerToken?: ScoreSaberPlayerToken
  ): Promise<PlayerDocument> {
    // Wait for the existing lock if it's in progress
    if (accountCreationLock[id] !== undefined) {
      await accountCreationLock[id];
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

      playerToken = playerToken || (await scoresaberService.lookupPlayer(id));

      if (!playerToken) {
        throw new NotFoundError(`Player "${id}" not found`);
      }

      // Create a new lock promise and assign it
      accountCreationLock[id] = (async () => {
        let newPlayer: PlayerDocument;
        try {
          Logger.info(`Creating player "${id}"...`);
          newPlayer = (await PlayerModel.create({ _id: id })) as PlayerDocument;
          newPlayer.trackedSince = new Date();
          await newPlayer.save();

          await this.seedPlayerHistory(newPlayer, playerToken);
          await this.refreshAllPlayerScores(newPlayer);

          // Notify in production
          if (isProduction()) {
            await logNewTrackedPlayer(playerToken);
          }
        } catch (err) {
          Logger.error(`Failed to create player document for "${id}"`, err);
          throw new InternalServerError(`Failed to create player document for "${id}"`);
        } finally {
          // Ensure the lock is always removed
          delete accountCreationLock[id];
        }

        return newPlayer;
      })();

      // Wait for the player creation to complete
      player = await accountCreationLock[id];
    }

    // Reset peak rank if it's 0
    if (player.peakRank?.rank == 0) {
      player.peakRank = undefined;
      player.markModified("peakRank");
      await player.save();
    }

    // Initialize player peak rank
    if (player.peakRank == undefined) {
      player.peakRank = player.getPeakRankFromHistory();
      player.markModified("peakRank");
      await player.save();
    }

    if (playerToken && player.inactive !== playerToken.inactive) {
      player.inactive = playerToken.inactive;
      await player.save();
    }

    return player as PlayerDocument;
  }

  /**
   * Checks if a player exists.
   *
   * @param id the player's id
   * @returns whether the player exists
   */
  public static async playerExists(id: string): Promise<boolean> {
    const player = await PlayerModel.exists({ _id: id });
    return player !== null;
  }

  /**
   * Tracks a player.
   *
   * @param id the player's id
   */
  public static async trackPlayer(id: string) {
    try {
      if (await this.playerExists(id)) {
        return true;
      }
      await this.getPlayer(id, true);
      return true;
    } catch {
      return false;
    }
  }

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
   * Ensures a player exists.
   *
   * @param playerId the player's id
   */
  private static async ensurePlayerExists(playerId: string): Promise<void> {
    if (!(await PlayerService.playerExists(playerId))) {
      throw new NotFoundError(`Player "${playerId}" not found`);
    }
  }

  /**
   * Gets the ranked pp scores for a player.
   *
   * @param playerId the player's id
   * @returns the ranked pp scores
   */
  public static async getPlayerRankedPps(playerId: string): Promise<PlayerRankedPpsResponse> {
    await this.ensurePlayerExists(playerId);

    const playerScores = await ScoreService.getPlayerScores(playerId, {
      ranked: true,
      sort: "pp",
      projection: { pp: 1, weight: 1, scoreId: 1 },
      includeLeaderboard: false,
    });

    if (playerScores.length === 0) {
      return {
        scores: [],
      };
    }

    const scores = playerScores.map(score => ({
      pp: score.score.pp,
      weight: score.score.weight,
      scoreId: score.score.scoreId,
    }));
    updateScoreWeights(scores);

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
    await this.ensurePlayerExists(playerId);
    const scoresPps = await this.getPlayerRankedPps(playerId);
    if (scoresPps.scores.length === 0) {
      return [0];
    }

    const boundaries: number[] = [];
    for (let i = 1; i < boundary + 1; i++) {
      boundaries.push(
        scoresaberService.calcPpBoundary(
          scoresPps.scores.map(score => score.pp),
          i
        )
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
    await this.ensurePlayerExists(playerId);
    const scoresPps = await this.getPlayerRankedPps(playerId);
    if (scoresPps.scores.length === 0) {
      return 0;
    }

    return scoresaberService.getPpBoundaryForRawPp(
      scoresPps.scores.map(score => score.pp),
      boundary
    );
  }

  /**
   * Gets the score calendar for a player.
   *
   * @param playerId the player's id
   * @param year the year to get the score calendar for
   * @param month the month to get the score calendar for
   */
  public static async getScoreCalendar(
    playerId: string,
    year: number,
    month: number
  ): Promise<PlayedMapsCalendarResponse> {
    await this.ensurePlayerExists(playerId);

    return fetchWithCache(
      CacheService.getCache(ServiceCache.ScoreCalendar),
      `score-calendar:${playerId}-${year}-${month}`,
      async () => {
        const player = await PlayerService.getPlayer(playerId);
        const history = player.getStatisticHistory();

        const days: Record<number, PlayedMapsCalendarStat> = {};
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
      await this.seedPlayerHistory(foundPlayer.id, player);
    }

    // Update current day's statistics
    let history = foundPlayer.getHistoryByDate(trackTime);
    if (history == undefined) {
      history = {}; // Initialize if history is not found
    }

    const scoreStats = player.scoreStats;
    const accuracies = await this.getPlayerAverageAccuracies(player.id);

    // Set the history data
    history.pp = player.pp;
    history.plusOnePp = (await PlayerService.getPlayerPpBoundary(player.id, 1))[0];
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
    foundPlayer.lastTracked = new Date();
    foundPlayer.markModified("statisticHistory");

    // Update players peak rank
    await PlayerService.updatePeakRank(foundPlayer.id, player);

    await foundPlayer.save();
    Logger.info(
      `Tracked player "${foundPlayer.id}" in ${(performance.now() - before).toFixed(0)}ms`
    );
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

    const playerScores = await ScoreService.getPlayerScores(playerId, {
      projection: {
        accuracy: 1,
        pp: 1,
      },
      includeLeaderboard: false,
    });

    // Filter out any scores with invalid accuracy values
    const validScores = playerScores.filter(
      playerScore =>
        Number.isFinite(playerScore.score.accuracy) &&
        playerScore.score.accuracy >= 0 &&
        playerScore.score.accuracy <= 100
    );

    if (validScores.length === 0) {
      return accuracies;
    }

    let unrankedScores = 0;
    let unrankedAccuracySum = 0;
    let totalAccuracySum = 0;

    for (const playerScore of validScores) {
      // Add to total accuracy regardless of ranked status
      totalAccuracySum += playerScore.score.accuracy;

      if (playerScore.score.pp === 0) {
        unrankedAccuracySum += playerScore.score.accuracy;
        unrankedScores++;
      }
    }

    // Calculate averages, defaulting to 0 if no scores in category
    accuracies.unrankedAccuracy = unrankedScores > 0 ? unrankedAccuracySum / unrankedScores : 0;
    accuracies.averageAccuracy = validScores.length > 0 ? totalAccuracySum / validScores.length : 0;

    return accuracies;
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
   * Gets the players around a player.
   *
   * @param id the player to get around
   * @param type the type to get around
   */
  public static async getPlayersAroundPlayer(
    id: string,
    type: AroundPlayer
  ): Promise<ScoreSaberPlayerToken[]> {
    const getRank = (player: ScoreSaberPlayer | ScoreSaberPlayerToken, type: AroundPlayer) => {
      switch (type) {
        case "global":
          return player.rank;
        case "country":
          return player.countryRank;
      }
    };

    const player = await ScoreSaberService.getPlayer(id);
    if (player == undefined) {
      throw new NotFoundError(`Player "${id}" not found`);
    }

    const rank = getRank(player, type);
    const itemsPerPage = 50;

    // Calculate which page contains our target player
    const targetPage = Math.ceil(rank / itemsPerPage);

    // Fetch the main page containing our player
    const mainResponse =
      type === "global"
        ? await scoresaberService.lookupPlayers(targetPage)
        : await scoresaberService.lookupPlayersByCountry(targetPage, player.country);

    if (!mainResponse) {
      return [];
    }

    let allPlayers = [...mainResponse.players];
    const playerIndex = allPlayers.findIndex(p => p.id === id);

    if (playerIndex === -1) {
      return [];
    }

    // Check if we need more players from adjacent pages
    const needsPlayersAbove = playerIndex < 3;
    const needsPlayersBelow = playerIndex > allPlayers.length - 2;

    // Fetch previous page if needed
    if (needsPlayersAbove && targetPage > 1) {
      const prevResponse =
        type === "global"
          ? await scoresaberService.lookupPlayers(targetPage - 1)
          : await scoresaberService.lookupPlayersByCountry(targetPage - 1, player.country);

      if (prevResponse) {
        allPlayers = [...prevResponse.players, ...allPlayers];
      }
    }

    // Fetch next page if needed
    if (needsPlayersBelow) {
      const nextResponse =
        type === "global"
          ? await scoresaberService.lookupPlayers(targetPage + 1)
          : await scoresaberService.lookupPlayersByCountry(targetPage + 1, player.country);

      if (nextResponse) {
        allPlayers = [...allPlayers, ...nextResponse.players];
      }
    }

    // Find the new index after combining pages
    const newPlayerIndex = allPlayers.findIndex(p => p.id === id);

    // Get 3 players above and 1 below, handling edge cases
    const start = Math.max(0, newPlayerIndex - 3);
    const end = Math.min(allPlayers.length, newPlayerIndex + 2);

    return allPlayers.slice(start, end);
  }

  /**
   * Refreshes all the players scores.
   *
   * @param player the player to refresh
   * @returns the total number of missing scores
   */
  public static async refreshAllPlayerScores(player: PlayerDocument): Promise<number> {
    Logger.info(`Refreshing scores for ${player.id}...`);
    let page = 1;
    let hasMorePages = true;
    let totalMissingScores = 0;

    const playerToken = await ScoreSaberService.getCachedPlayer(player.id, true).catch(
      () => undefined
    );
    if (playerToken == undefined) {
      Logger.warn(`Player "${player.id}" not found on ScoreSaber`);
      return 0;
    }

    while (hasMorePages) {
      const scoresPage = await scoresaberService.lookupPlayerScores({
        playerId: player.id,
        page: page,
        limit: 100,
        sort: ScoreSort.recent,
      });

      if (!scoresPage) {
        console.warn(`Failed to fetch scores for ${player.id} on page ${page}.`);
        break;
      }

      let missingScores = 0;
      await Promise.all(
        scoresPage.playerScores.map(async score => {
          if (
            await ScoreService.trackScoreSaberScore(
              score.score,
              score.leaderboard,
              playerToken,
              false
            )
          ) {
            missingScores++;
            totalMissingScores++;
          }
        })
      );

      // Stop paginating if no scores are missing OR if player has seededScores marked true
      if (
        (missingScores === 0 && player.seededScores) ||
        page >= Math.ceil(scoresPage.metadata.total / 100)
      ) {
        hasMorePages = false;
      }

      page++;
    }

    // Mark player as seeded
    player.seededScores = true;
    await player.save();

    Logger.info(`Finished refreshing scores for ${player.id}, total pages refreshed: ${page - 1}.`);
    return totalMissingScores;
  }

  /**
   * Ensures all player scores are up-to-date.
   *
   * @returns the total number of missing scores
   */
  public static async refreshPlayerScores(): Promise<number> {
    Logger.info(`Refreshing player score data...`);

    const players = await PlayerModel.find({});
    Logger.info(`Found ${players.length} players to refresh.`);

    let totalMissingScores = 0;
    for (const player of players) {
      totalMissingScores += await this.refreshAllPlayerScores(player);
    }
    return totalMissingScores;
  }

  /**
   * Updates the player statistics for all players.
   */
  public static async updatePlayerStatistics() {
    const pages = 20; // top 1000 players

    let toTrack: PlayerDocument[] = await PlayerModel.find({});
    const players: ScoreSaberPlayerToken[] = [];

    const dateNow = new Date();

    // loop through pages to fetch the top players
    console.log(`Fetching ${pages} pages of players from ScoreSaber...`);
    for (let i = 0; i < pages; i++) {
      const pageNumber = i + 1;
      try {
        console.log(`Fetching page ${pageNumber}...`);
        const page = await scoresaberService.lookupPlayers(pageNumber);
        if (page === undefined) {
          console.log(`Failed to fetch players on page ${pageNumber}, skipping page...`);
          continue;
        }
        for (const player of page.players) {
          players.push(player);
        }
      } catch (error) {
        Logger.error(`Error fetching page ${pageNumber}: ${error}`);
      }
    }

    for (const player of players) {
      try {
        const foundPlayer = await PlayerService.getPlayer(player.id, true, player);
        await PlayerService.trackScoreSaberPlayer(foundPlayer, dateNow, player);
      } catch (error) {
        Logger.error(`Error tracking player ${player.id}: ${error}`);
      }
    }

    // remove all players that have been tracked
    toTrack = toTrack.filter(player => !players.map(player => player.id).includes(player.id));

    console.log(`Tracking ${toTrack.length} player statistics...`);
    for (const player of toTrack) {
      if (player.inactive) {
        Logger.info(`Skipping inactive player, ${player.id}`);
        continue;
      }
      try {
        await PlayerService.trackScoreSaberPlayer(player, dateNow);
      } catch (error) {
        Logger.error(`Error tracking player ${player.id}: ${error}`);
      }
    }
    console.log("Finished tracking player statistics.");
  }

  /**
   * Gets the most common HMD used by
   * a player in the last 50 scores
   *
   * @param playerId the id of the player
   * @returns the hmd
   */
  public static async getPlayerHMD(playerId: string): Promise<HMD | undefined> {
    // Get player's most used HMD in the last 50 scores
    const scores = await ScoreService.getPlayerScores(playerId, {
      limit: 50,
      sort: "timestamp",
      includeLeaderboard: false,
    });

    const hmds: Map<HMD, number> = new Map();
    for (const playerScore of scores) {
      if (!playerScore.score.hmd) {
        continue;
      }
      hmds.set(playerScore.score.hmd as HMD, (hmds.get(playerScore.score.hmd as HMD) || 0) + 1);
    }
    if (hmds.size === 0) {
      return undefined;
    }
    return Array.from(hmds.entries()).sort((a, b) => b[1] - a[1])[0][0];
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
      },
    });

    const data: PlayerScoreChartDataPoint[] = [];
    for (const playerScore of playerScores) {
      const leaderboard = playerScore.leaderboard as ScoreSaberLeaderboard;
      const score = playerScore.score as ScoreSaberScore;

      data.push({
        accuracy: score.accuracy,
        stars: leaderboard.stars,
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

    const playerScores = await ScoreService.getPlayerScores(playerId, {
      sort: "timestamp",
      ranked: true,
      projection: {
        accuracy: 1,
      },
      includeLeaderboard: false,
    });

    for (const playerScore of playerScores) {
      const accuracy = playerScore.score.accuracy;
      const scoreBadge = getScoreBadgeFromAccuracy(accuracy);
      if (scoreBadge.name !== "-") {
        badges[scoreBadge.name.replace("+", "Plus") as keyof AccBadges]++;
      }
    }

    return badges;
  }
  /**
   * Gets the player's statistic history.
   *
   * @param player the player
   * @param account the account
   * @param accuracies the accuracies
   * @param type the type
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
              ...(account
                ? { plusOnePp: (await PlayerService.getPlayerPpBoundary(account.id, 1))[0] }
                : undefined),
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
}
