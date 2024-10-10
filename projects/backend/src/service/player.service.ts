import { PlayerDocument, PlayerModel } from "../model/player";
import { NotFoundError } from "../error/not-found-error";
import { cron } from "@elysiajs/cron";
import { app } from "../index";
import { getDaysAgoDate, getMidnightAlignedDate } from "@ssr/common/utils/time-utils";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import ScoreSaberPlayerToken from "@ssr/common/types/token/scoresaber/score-saber-player-token";
import { InternalServerError } from "../error/internal-server-error";

export class PlayerService {
  /**
   * Initialize the cron jobs
   */
  public static initCronjobs() {
    app.use(
      cron({
        name: "player-statistics-tracker-cron",
        pattern: "0 1 * * *", // Every day at 00:01 (midnight)
        run: async () => {
          console.log("Tracking player statistics...");
          const players: PlayerDocument[] = await PlayerModel.find({});
          for (const player of players) {
            await PlayerService.trackScoreSaberPlayer(getMidnightAlignedDate(new Date()), player);
          }
          console.log("Finished tracking player statistics.");
        },
      })
    );
  }

  /**
   * Get a player from the database.
   *
   * @param id the player to fetch
   * @param create if true, create the player if it doesn't exist
   * @returns the player
   * @throws NotFoundError if the player is not found
   */
  public static async getPlayer(id: string, create: boolean = false): Promise<PlayerDocument> {
    let player: PlayerDocument | null = await PlayerModel.findById(id);
    if (player === null && !create) {
      throw new NotFoundError(`Player "${id}" not found`);
    }
    if (player === null) {
      const playerToken = await scoresaberService.lookupPlayer(id);
      if (playerToken === undefined) {
        throw new NotFoundError(`Player "${id}" not found`);
      }

      console.log(`Creating player "${id}"...`);
      player = (await PlayerModel.create({ _id: id })) as any;
      if (player === null) {
        throw new InternalServerError(`Failed to create player document for "${id}"`);
      }
      player.trackedSince = new Date();
      await this.seedPlayerHistory(player, playerToken);
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
      const date = getMidnightAlignedDate(getDaysAgoDate(daysAgo));
      player.setStatisticHistory(date, {
        rank: rank,
      });
      daysAgo += 1; // Increment daysAgo for each earlier rank
    }
    await player.save();
  }

  /**
   * Tracks a players statistics
   *
   * @param dateToday the date to track
   * @param foundPlayer the player to track
   */
  public static async trackScoreSaberPlayer(dateToday: Date, foundPlayer: PlayerDocument) {
    const player = await scoresaberService.lookupPlayer(foundPlayer.id);
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
    foundPlayer.setStatisticHistory(dateToday, history);
    foundPlayer.sortStatisticHistory();
    foundPlayer.lastTracked = new Date();
    await foundPlayer.save();

    console.log(`Tracked player "${foundPlayer.id}"!`);
  }
}
