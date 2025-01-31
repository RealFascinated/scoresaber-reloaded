import { PlayerDocument, PlayerModel } from "@ssr/common/model/player";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import { getDaysAgoDate, getMidnightAlignedDate } from "@ssr/common/utils/time-utils";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { InternalServerError } from "@ssr/common/error/internal-server-error";
import { delay, getPageFromRank, isProduction } from "@ssr/common/utils/utils";
import { AroundPlayer } from "@ssr/common/types/around-player";
import { ScoreSort } from "@ssr/common/score/score-sort";
import { logNewTrackedPlayer } from "../common/embds";
import ScoreSaberPlayerToken from "@ssr/common/types/token/scoresaber/player";
import { fetchWithCache } from "../common/cache.util";
import { PlayedMapsCalendarResponse, PlayedMapsCalendarStat } from "@ssr/common/response/played-maps-calendar-response";
import CacheService, { ServiceCache } from "./cache.service";
import ScoreSaberService from "./scoresaber.service";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { getScoreSaberLeaderboardFromToken } from "@ssr/common/token-creators";
import ScoreSaberPlayerScoreToken from "@ssr/common/types/token/scoresaber/player-score";
import { HMD } from "@ssr/common/hmds";
import { SCORESABER_REQUEST_COOLDOWN } from "./leaderboard.service";
import { PlayerScoreChartDataPoint, PlayerScoresChartResponse } from "@ssr/common/response/player-scores-chart";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { getDifficulty } from "@ssr/common/utils/song-utils";

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

    let player: PlayerDocument | null = await PlayerModel.findById(id);
    if (player === null) {
      if (!create) {
        throw new NotFoundError(`Player "${id}" not found`);
      }

      playerToken = playerToken || (await scoresaberService.lookupPlayer(id));

      if (!playerToken) {
        throw new NotFoundError(`Player "${id}" not found`);
      }

      // Create a new lock promise and assign it
      accountCreationLock[id] = (async () => {
        let newPlayer: PlayerDocument;
        try {
          console.log(`Creating player "${id}"...`);
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
          console.log(`Failed to create player document for "${id}"`, err);
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

    // Update player name
    if (playerToken) {
      if (player.name !== playerToken.name) {
        player.name = playerToken.name;
        await player.save();
      }
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
  public static async seedPlayerHistory(player: PlayerDocument, playerToken: ScoreSaberPlayerToken): Promise<void> {
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
   * Gets the pp boundary for a player.
   *
   * @param playerId the player's id
   * @param boundary the pp boundary
   */
  public static async getPlayerPpBoundary(playerId: string, boundary: number = 1): Promise<number[]> {
    const scoresPps = await fetchWithCache<number[]>(
      CacheService.getCache(ServiceCache.PPBoundary),
      `pp-boundary-scores:${playerId}`,
      async () => {
        await PlayerService.getPlayer(playerId); // Ensure player exists
        const playerScores = await ScoreSaberService.getPlayerScores(playerId, {
          ranked: true,
          sort: "pp",
          projection: {
            pp: 1,
          },
        });
        return playerScores.map(score => score.score.pp);
      }
    );

    if (scoresPps.length === 0) {
      return [0];
    }

    const boundaries: number[] = [];
    for (let i = 1; i < boundary + 1; i++) {
      boundaries.push(scoresaberService.calcPpBoundary(scoresPps, i));
    }
    return boundaries;
  }

  /**
   * Gets the pp boundary amount for a pp value.
   *
   * @param playerId the player's id
   * @param boundary the pp boundary
   */
  public static async getPlayerPpBoundaryFromScorePp(playerId: string, boundary: number = 1): Promise<number> {
    const scoresPps = await fetchWithCache<number[]>(
      CacheService.getCache(ServiceCache.PPBoundary),
      `pp-boundary-scores:${playerId}`,
      async () => {
        await PlayerService.getPlayer(playerId); // Ensure player exists
        const playerScores = await ScoreSaberService.getPlayerScores(playerId, {
          ranked: true,
          sort: "pp",
          projection: {
            pp: 1,
          },
        });
        return playerScores.map(score => score.score.pp);
      }
    );

    if (scoresPps.length === 0) {
      return 0;
    }

    return scoresaberService.getPpBoundaryForRawPp(scoresPps, boundary);
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

          if (metadata[date.getFullYear()] === undefined || !metadata[date.getFullYear()].includes(statMonth)) {
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
      console.log(`Player "${foundPlayer.id}" not found on ScoreSaber`);
      return;
    }
    if (player.inactive) {
      console.log(`Player "${foundPlayer.id}" is inactive on ScoreSaber`);
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
    console.log(`Tracked player "${foundPlayer.id}" in ${(performance.now() - before).toFixed(0)}ms`);
  }

  /**
   * Gets the player's average accuracies.
   *
   * @param playerId the player's id
   * @returns the player's accuracy
   */
  public static async getPlayerAverageAccuracies(playerId: string): Promise<{
    unrankedAccuracy: number;
    averageAccuracy: number;
  }> {
    const accuracies = {
      unrankedAccuracy: 0,
      averageAccuracy: 0,
    };

    const playerScores = await ScoreSaberService.getPlayerScores(playerId, {
      projection: {
        accuracy: 1,
        pp: 1,
      },
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

    if (!foundPlayer.peakRank || (foundPlayer.peakRank && playerToken.rank < foundPlayer.peakRank.rank)) {
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
  public static async getPlayersAroundPlayer(id: string, type: AroundPlayer): Promise<ScoreSaberPlayerToken[]> {
    const getRank = (player: ScoreSaberPlayer | ScoreSaberPlayerToken, type: AroundPlayer) => {
      switch (type) {
        case "global":
          return player.rank;
        case "country":
          return player.countryRank;
      }
    };

    const itemsPerPage = 50;
    const player = await ScoreSaberService.getPlayer(id);
    if (player == undefined) {
      throw new NotFoundError(`Player "${id}" not found`);
    }
    const rank = getRank(player, type);
    const rankWithinPage = rank % itemsPerPage;

    let pagesToSearch = [getPageFromRank(rank, itemsPerPage)];
    if (rankWithinPage > 0) {
      pagesToSearch.push(getPageFromRank(rank - 1, itemsPerPage));
    } else if (rankWithinPage < itemsPerPage - 1) {
      pagesToSearch.push(getPageFromRank(rank + 1, itemsPerPage));
    }
    // Remove duplicates
    pagesToSearch = pagesToSearch.filter((value, index, self) => {
      return self.indexOf(value) === index;
    });

    const rankings: Map<string, ScoreSaberPlayerToken> = new Map();
    for (const page of pagesToSearch) {
      const response =
        type == "global"
          ? await scoresaberService.lookupPlayers(page)
          : await scoresaberService.lookupPlayersByCountry(page, player.country);
      if (response == undefined) {
        continue;
      }

      for (const player of response.players) {
        if (rankings.has(player.id)) {
          continue;
        }

        rankings.set(player.id, player);
      }
    }

    const players = rankings
      .values()
      .toArray()
      .sort((a, b) => {
        return getRank(a, type) - getRank(b, type);
      });

    // Show 3 players above and 1 below the requested player
    const playerPosition = players.findIndex(p => p.id === player.id);
    const start = Math.max(0, playerPosition - 3);
    let end = Math.min(players.length, playerPosition + 2);

    const playersLength = players.slice(start, end).length;

    // If there is less than 5 players to return, add more players to the end
    if (playersLength < 5) {
      end = Math.min(end + 5 - playersLength, players.length);
    }

    return players.slice(start, end);
  }

  /**
   * Refreshes all the players scores.
   *
   * @param player the player to refresh
   * @returns the total number of missing scores
   */
  public static async refreshAllPlayerScores(player: PlayerDocument): Promise<number> {
    console.log(`Refreshing scores for ${player.id}...`);
    let page = 1;
    let hasMorePages = true;
    let totalMissingScores = 0;

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
          if (await ScoreSaberService.trackScoreSaberScore(score.score, score.leaderboard, player.id)) {
            missingScores++;
            totalMissingScores++;
          }
        })
      );

      // Stop paginating if no scores are missing OR if player has seededScores marked true
      if ((missingScores === 0 && player.seededScores) || page >= Math.ceil(scoresPage.metadata.total / 100)) {
        hasMorePages = false;
      }

      page++;
      await delay(SCORESABER_REQUEST_COOLDOWN); // Cooldown between page requests
    }

    // Mark player as seeded
    player.seededScores = true;
    await player.save();

    console.log(`Finished refreshing scores for ${player.id}, total pages refreshed: ${page - 1}.`);
    return totalMissingScores;
  }

  /**
   * Ensures all player scores are up-to-date.
   *
   * @returns the total number of missing scores
   */
  public static async refreshPlayerScores(): Promise<number> {
    console.log(`Refreshing player score data...`);

    const players = await PlayerModel.find({});
    console.log(`Found ${players.length} players to refresh.`);

    let totalMissingScores = 0;
    for (const player of players) {
      totalMissingScores += await this.refreshAllPlayerScores(player);
      await delay(SCORESABER_REQUEST_COOLDOWN); // Cooldown between players
    }
    return totalMissingScores;
  }

  /**
   * Updates the player statistics for all players.
   *
   * This will first get the top 2000 players and then force track the top 1000
   * players, it will then get the leftover players (not in the top 2500) and
   * track them individually.
   */
  public static async updatePlayerStatistics() {
    // Pages to search for players in (total players / players per page)
    const pages = Math.ceil(2000 / 50);

    const trackTime = new Date();
    const toTrack: PlayerDocument[] = await PlayerModel.find({});
    const players: ScoreSaberPlayerToken[] = [];

    // loop through pages to fetch the top players
    console.log(`Fetching ${pages} pages of players from ScoreSaber...`);
    for (let i = 0; i < pages; i++) {
      // Check the first 50 pages
      const pageNumber = i + 1;
      const page = await scoresaberService.lookupPlayers(pageNumber);
      if (page === undefined) {
        console.log(`Failed to fetch players on page ${pageNumber}, skipping page...`);
        await delay(SCORESABER_REQUEST_COOLDOWN);
        continue;
      }
      for (const player of page.players) {
        players.push(player);
      }
      await delay(SCORESABER_REQUEST_COOLDOWN);
    }

    for (const player of players) {
      // Only track players <= 1000 rank or if they need to be tracked
      const shouldTrack = player.rank <= 1000 || toTrack.map(p => p.id).includes(player.id);
      if (!shouldTrack) {
        continue;
      }

      const foundPlayer = await PlayerService.getPlayer(player.id, true, player);
      await PlayerService.trackScoreSaberPlayer(foundPlayer, trackTime, player);
    }

    // Only track leftover players that we are tracking and that
    // haven't already been tracked by the loop above
    const leftoverPlayers: PlayerDocument[] = [];
    for (const trackedPlayer of toTrack) {
      const isInFetchedPlayers = players.some(p => p.id === trackedPlayer.id);
      if (!isInFetchedPlayers) {
        leftoverPlayers.push(trackedPlayer);
      }
    }

    console.log(`Tracking ${leftoverPlayers.length} leftover player statistics...`);
    for (const player of leftoverPlayers) {
      await PlayerService.trackScoreSaberPlayer(player, trackTime);
      await delay(SCORESABER_REQUEST_COOLDOWN);
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
    const scores = await ScoreSaberService.getPlayerScores(playerId, {
      limit: 50,
      sort: "timestamp",
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
    const playerScores = await ScoreSaberService.getPlayerScores(playerId, {
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
      const difficulty = getDifficulty(leaderboard.difficulty.difficulty);

      data.push({
        accuracy: score.accuracy,
        stars: leaderboard.stars,
        leaderboardId: leaderboard.id + "",
        leaderboardName: leaderboard.fullName,
        leaderboardDifficulty: difficulty.alternativeName ?? difficulty.name,
      });
    }

    return {
      data,
    };
  }
}
