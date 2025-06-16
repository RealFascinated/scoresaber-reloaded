import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import Logger from "@ssr/common/logger";
import { PlayerDocument, PlayerModel } from "@ssr/common/model/player";
import {
  getScoreSaberLeaderboardFromToken,
  getScoreSaberScoreFromToken,
} from "@ssr/common/token-creators";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { EmbedBuilder } from "discord.js";
import { DiscordChannels, logToChannel } from "../../bot/bot";
import { ScoreService } from "../score/score.service";
import { PlayerHistoryService } from "./player-history.service";
import { PlayerService } from "./player.service";

export class PlayerRefreshService {
  /**
   * Refreshes all the players scores.
   *
   * @param player the player to refresh
   * @returns the total number of missing scores
   */
  public static async refreshAllPlayerScores(
    player: PlayerDocument,
    playerToken: ScoreSaberPlayerToken
  ): Promise<number> {
    Logger.info(`Refreshing scores for ${player.id}...`);
    let page = 1;
    let hasMorePages = true;
    let totalMissingScores = 0;

    while (hasMorePages) {
      const scoresPage = await ApiServiceRegistry.getInstance()
        .getScoreSaberService()
        .lookupPlayerScores({
          playerId: player.id,
          page: page,
          limit: 100,
          sort: "recent",
        });

      if (!scoresPage) {
        console.warn(`Failed to fetch scores for ${player.id} on page ${page}.`);
        break;
      }

      let missingScores = 0;
      await Promise.all(
        scoresPage.playerScores.map(async score => {
          const { tracked } = await ScoreService.trackScoreSaberScore(
            getScoreSaberScoreFromToken(
              score.score,
              getScoreSaberLeaderboardFromToken(score.leaderboard),
              player.id
            ),
            getScoreSaberLeaderboardFromToken(score.leaderboard),
            playerToken,
            false
          );
          if (tracked) {
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
    player.markModified("seededScores");
    await player.save();

    Logger.info(`Finished refreshing scores for ${player.id}, total pages refreshed: ${page - 1}.`);
    return totalMissingScores;
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

    for (let i = 1; i <= pages; i++) {
      Logger.info(`Fetching page ${i}...`);
      const page = await ApiServiceRegistry.getInstance().getScoreSaberService().lookupPlayers(i);

      if (page == undefined) {
        Logger.error(`Failed to fetch players on page ${i}, skipping page...`);
        errorCount++;
        continue;
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
              await PlayerHistoryService.trackPlayerHistory(foundPlayer, now, player);
              successCount++;
            })();

            await Promise.race([processPromise, timeoutPromise]);
          } catch (error) {
            Logger.error(`Failed to track seeded player ${player.id} (${player.name}): ${error}`);
            errorCount++;
          } finally {
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
          }
        })
      );

      Logger.info(`Completed page ${i}`);
    }

    // Log the number of active players found
    Logger.info(`Found ${playerIds.size} active players from ScoreSaber API`);

    // Get all player IDs from database
    const allPlayerIds = await PlayerModel.find({}, { id: 1 });
    Logger.info(`Total players in database: ${allPlayerIds.length}`);

    // Check each player's status directly
    for (const { id } of allPlayerIds) {
      if (!playerIds.has(id)) {
        try {
          // Try to fetch player directly from ScoreSaber
          const playerResponse = await ApiServiceRegistry.getInstance()
            .getScoreSaberService()
            .lookupPlayer(id);

          // If we can't find the player, mark them as inactive
          if (!playerResponse) {
            await PlayerModel.updateOne({ id }, { $set: { inactive: true } });
            Logger.info(`Marked player ${id} as inactive - not found on ScoreSaber`);
          }
        } catch (error) {
          Logger.error(`Error checking player ${id}: ${error}`);
        }
      }
    }

    const inactivePlayers = await PlayerModel.countDocuments({ inactive: true });
    Logger.info(`Total inactive players after update: ${inactivePlayers}`);

    Logger.info(
      `Finished tracking player statistics in ${(performance.now() - now.getTime()).toFixed(0)}ms\n` +
        `Successfully processed: ${successCount} players\n` +
        `Failed to process: ${errorCount} players`
    );
    logToChannel(
      DiscordChannels.backendLogs,
      new EmbedBuilder()
        .setTitle(`Refreshed ${successCount} players.`)
        .setDescription(
          [
            `Successfully processed: ${successCount} players`,
            `Failed to process: ${errorCount} players`,
            `Inactive players (in db): ${inactivePlayers}`,
          ].join("\n")
        )
        .setColor("#00ff00")
    );
  }
}
