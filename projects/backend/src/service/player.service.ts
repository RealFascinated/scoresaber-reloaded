import { PlayerDocument, PlayerModel } from "@ssr/common/model/player";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import { getDaysAgoDate, getMidnightAlignedDate } from "@ssr/common/utils/time-utils";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import ScoreSaberPlayerToken from "@ssr/common/types/token/scoresaber/score-saber-player-token";
import { InternalServerError } from "@ssr/common/error/internal-server-error";
import { formatPp } from "@ssr/common/utils/number-utils";
import { delay, getPageFromRank, isProduction } from "@ssr/common/utils/utils";
import { DiscordChannels, logToChannel } from "../bot/bot";
import { EmbedBuilder } from "discord.js";
import { AroundPlayer } from "@ssr/common/types/around-player";
import { ScoreSort } from "@ssr/common/score/score-sort";
import { getScoreSaberLeaderboardFromToken } from "@ssr/common/token-creators";
import { ScoreService } from "./score.service";

export class PlayerService {
  /**
   * Get a player from the database.
   *
   * @param id the player to fetch
   * @param create if true, create the player if it doesn't exist
   * @param playerToken an optional player token for the player
   * @returns the player
   * @throws NotFoundError if the player is not found
   */
  public static async getPlayer(
    id: string,
    create: boolean = false,
    playerToken?: ScoreSaberPlayerToken
  ): Promise<PlayerDocument> {
    let player: PlayerDocument | null = await PlayerModel.findById(id);
    if (player === null) {
      // If create is on, create the player, otherwise return unknown player
      playerToken = create ? (playerToken ? playerToken : await scoresaberService.lookupPlayer(id)) : undefined;
      if (playerToken === undefined) {
        throw new NotFoundError(`Player "${id}" not found`);
      }

      console.log(`Creating player "${id}"...`);
      try {
        player = (await PlayerModel.create({ _id: id })) as PlayerDocument;
        player.trackedSince = new Date();
        await this.seedPlayerHistory(player, playerToken);

        // Only notify in production
        if (isProduction()) {
          await logToChannel(
            DiscordChannels.trackedPlayerLogs,
            new EmbedBuilder()
              .setTitle("New Player Tracked")
              .setDescription(`https://ssr.fascinated.cc/player/${playerToken.id}`)
              .addFields([
                {
                  name: "Username",
                  value: playerToken.name,
                  inline: true,
                },
                {
                  name: "ID",
                  value: playerToken.id,
                  inline: true,
                },
                {
                  name: "PP",
                  value: formatPp(playerToken.pp) + "pp",
                  inline: true,
                },
              ])
              .setThumbnail(playerToken.profilePicture)
              .setColor("#00ff00")
          );
        }
      } catch (err) {
        const message = `Failed to create player document for "${id}"`;
        console.log(message, err);
        throw new InternalServerError(message);
      }
    }
    return player;
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
    for (let i = playerRankHistory.length - daysAgo - 1; i >= 0; i--) {
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
   * @param playerToken an optional player token
   */
  public static async trackScoreSaberPlayer(
    foundPlayer: PlayerDocument,
    playerToken?: ScoreSaberPlayerToken
  ): Promise<void> {
    const dateToday = getMidnightAlignedDate(new Date());
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
      await this.seedPlayerHistory(foundPlayer, player);
    }

    // Update current day's statistics
    let history = foundPlayer.getHistoryByDate(dateToday);
    if (history == undefined) {
      history = {}; // Initialize if history is not found
    }

    const scoreStats = player.scoreStats;

    // Set the history data
    history.pp = player.pp;
    history.countryRank = player.countryRank;
    history.rank = player.rank;
    history.accuracy = {
      ...history.accuracy,
      averageRankedAccuracy: scoreStats.averageRankedAccuracy,
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

    foundPlayer.setStatisticHistory(dateToday, history);
    foundPlayer.sortStatisticHistory();
    foundPlayer.lastTracked = new Date();
    foundPlayer.markModified("statisticHistory");
    await foundPlayer.save();

    console.log(`Tracked player "${foundPlayer.id}"!`);
  }

  /**
   * Gets the players around a player.
   *
   * @param id the player to get around
   * @param type the type to get around
   */
  public static async getPlayersAroundPlayer(id: string, type: AroundPlayer): Promise<ScoreSaberPlayerToken[]> {
    const getRank = (player: ScoreSaberPlayerToken, type: AroundPlayer) => {
      switch (type) {
        case "global":
          return player.rank;
        case "country":
          return player.countryRank;
      }
    };

    const itemsPerPage = 50;
    const player = await scoresaberService.lookupPlayer(id);
    if (player == undefined) {
      throw new NotFoundError(`Player "${id}" not found`);
    }
    const rank = getRank(player, type);
    const rankWithinPage = rank % itemsPerPage;

    const pagesToSearch = [getPageFromRank(rank, itemsPerPage)];
    if (rankWithinPage > 0) {
      pagesToSearch.push(getPageFromRank(rank - 1, itemsPerPage));
    } else if (rankWithinPage < itemsPerPage - 1) {
      pagesToSearch.push(getPageFromRank(rank + 1, itemsPerPage));
    }

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
   * Ensures all player scores are up-to-date.
   */
  public static async refreshPlayerScores() {
    const cooldown = 60_000 / 250; // 250 requests per minute
    console.log(`Refreshing player score data...`);

    const players = await PlayerModel.find({});
    console.log(`Found ${players.length} players to refresh.`);

    for (const player of players) {
      console.log(`Refreshing scores for ${player.id}...`);
      let page = 1;
      let hasMorePages = true;

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
        for (const score of scoresPage.playerScores) {
          const leaderboard = getScoreSaberLeaderboardFromToken(score.leaderboard);
          const scoreSaberScore = await ScoreService.getScoreSaberScore(
            player.id,
            leaderboard.id + "",
            leaderboard.difficulty.difficulty,
            leaderboard.difficulty.characteristic,
            score.score.baseScore
          );

          if (scoreSaberScore == null) {
            missingScores++;
          }
          await ScoreService.trackScoreSaberScore(score.score, score.leaderboard, player.id);
        }

        // Stop paginating if no scores are missing OR if player has seededScores marked true
        if ((missingScores === 0 && player.seededScores) || page >= Math.ceil(scoresPage.metadata.total / 100)) {
          hasMorePages = false;
        }

        page++;
        await delay(cooldown); // Cooldown between page requests
      }

      // Mark player as seeded
      player.seededScores = true;
      await player.save();

      console.log(`Finished refreshing scores for ${player.id}, total pages refreshed: ${page - 1}.`);
      await delay(cooldown); // Cooldown between players
    }
  }

  /**
   * Updates the player statistics for all players.
   */
  public static async updatePlayerStatistics() {
    const pages = 20; // top 1000 players
    const cooldown = 60_000 / 250; // 250 requests per minute

    let toTrack: PlayerDocument[] = await PlayerModel.find({});
    const toRemoveIds: string[] = [];

    // loop through pages to fetch the top players
    console.log(`Fetching ${pages} pages of players from ScoreSaber...`);
    for (let i = 0; i < pages; i++) {
      const pageNumber = i + 1;
      console.log(`Fetching page ${pageNumber}...`);
      const page = await scoresaberService.lookupPlayers(pageNumber);
      if (page === undefined) {
        console.log(`Failed to fetch players on page ${pageNumber}, skipping page...`);
        await delay(cooldown);
        continue;
      }
      for (const player of page.players) {
        const foundPlayer = await PlayerService.getPlayer(player.id, true, player);
        await PlayerService.trackScoreSaberPlayer(foundPlayer, player);
        toRemoveIds.push(foundPlayer.id);
      }
      await delay(cooldown);
    }
    console.log(`Finished tracking player statistics for ${pages} pages, found ${toRemoveIds.length} players.`);

    // remove all players that have been tracked
    toTrack = toTrack.filter(player => !toRemoveIds.includes(player.id));

    console.log(`Tracking ${toTrack.length} player statistics...`);
    for (const player of toTrack) {
      await PlayerService.trackScoreSaberPlayer(player);
      await delay(cooldown);
    }
    console.log("Finished tracking player statistics.");
  }
}
