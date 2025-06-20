import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { CooldownPriority } from "@ssr/common/cooldown";
import Logger from "@ssr/common/logger";
import { PlayerDocument, PlayerModel } from "@ssr/common/model/player";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import {
  getScoreSaberLeaderboardFromToken,
  getScoreSaberScoreFromToken,
} from "@ssr/common/token-creators";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { EmbedBuilder } from "discord.js";
import { DiscordChannels, logToChannel } from "../../bot/bot";
import { QueueId, QueueManager } from "../../queue/queue-manager";
import { ScoreService } from "../score/score.service";
import { PlayerHistoryService } from "./player-history.service";
import { PlayerService } from "./player.service";

type PlayerRefreshResult = {
  missingScores: number;
  totalScores: number;
  totalPages: number;
  timeTaken: number;
};

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
  ): Promise<PlayerRefreshResult> {
    Logger.info(`Refreshing scores for ${player.id}...`);
    let page = 1;
    let hasMorePages = true;
    const startTime = performance.now();

    const result: PlayerRefreshResult = {
      missingScores: 0,
      totalScores: 0,
      totalPages: 0,
      timeTaken: 0,
    };

    while (hasMorePages) {
      const scoresPage = await ApiServiceRegistry.getInstance()
        .getScoreSaberService()
        .lookupPlayerScores({
          playerId: player.id,
          page: page,
          limit: 100,
          sort: "recent",
          priority: CooldownPriority.Low,
        });

      if (!scoresPage) {
        console.warn(`Failed to fetch scores for ${player.id} on page ${page}.`);
        break;
      }

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
            result.missingScores++;
          }
          result.totalScores++;
        })
      );

      // Stop if we've reached the last page
      if (page >= Math.ceil(scoresPage.metadata.total / 100)) {
        result.totalPages = page;
        hasMorePages = false;
      }

      page++;
    }

    // Mark player as seeded
    player.seededScores = true;
    player.markModified("seededScores");
    await player.save();

    Logger.info(`Finished refreshing scores for ${player.id}, total pages refreshed: ${page - 1}.`);
    result.timeTaken = performance.now() - startTime;
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
      DiscordChannels.backendLogs,
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
}
