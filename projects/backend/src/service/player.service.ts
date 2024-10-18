import { PlayerDocument, PlayerModel } from "@ssr/common/model/player";
import { NotFoundError } from "../error/not-found-error";
import { getDaysAgoDate, getMidnightAlignedDate } from "@ssr/common/utils/time-utils";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import ScoreSaberPlayerToken from "@ssr/common/types/token/scoresaber/score-saber-player-token";
import { InternalServerError } from "../error/internal-server-error";
import ScoreSaberPlayerScoreToken from "@ssr/common/types/token/scoresaber/score-saber-player-score-token";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { formatPp } from "@ssr/common/utils/number-utils";
import { isProduction } from "@ssr/common/utils/utils";
import { DiscordChannels, logToChannel } from "../bot/bot";
import { EmbedBuilder } from "discord.js";

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

    let daysAgo = 1; // Start from yesterday
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
    // Set the history data
    history.pp = player.pp;
    history.countryRank = player.countryRank;
    history.rank = player.rank;
    history.accuracy = {
      averageRankedAccuracy: player.scoreStats.averageRankedAccuracy,
    };
    foundPlayer.setStatisticHistory(dateToday, history);
    foundPlayer.sortStatisticHistory();
    foundPlayer.lastTracked = new Date();
    foundPlayer.markModified("statisticHistory");
    await foundPlayer.save();

    console.log(`Tracked player "${foundPlayer.id}"!`);
  }

  /**
   * Track player score.
   *
   * @param score the score to track
   * @param leaderboard the leaderboard to track
   */
  public static async trackScore({ score, leaderboard }: ScoreSaberPlayerScoreToken) {
    const playerId = score.leaderboardPlayerInfo.id;
    const playerName = score.leaderboardPlayerInfo.name;
    const player: PlayerDocument | null = await PlayerModel.findById(playerId);
    // Player is not tracked, so ignore the score.
    if (player == undefined) {
      return;
    }

    const today = new Date();
    let history = player.getHistoryByDate(today);
    if (history == undefined || Object.keys(history).length === 0) {
      history = { scores: { rankedScores: 0, unrankedScores: 0 } }; // Ensure initialization
    }

    const scores = history.scores || {};
    if (leaderboard.stars > 0) {
      scores.rankedScores!++;
    } else {
      scores.unrankedScores!++;
    }

    history.scores = scores;
    player.setStatisticHistory(today, history);
    player.sortStatisticHistory();

    // Save the changes
    player.markModified("statisticHistory");
    await player.save();

    console.log(
      `Updated scores set statistic for "${playerName}"(${playerId}), scores today: ${scores.rankedScores} ranked, ${scores.unrankedScores} unranked`
    );
  }
}
