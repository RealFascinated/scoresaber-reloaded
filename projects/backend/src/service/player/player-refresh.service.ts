import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { CooldownPriority } from "@ssr/common/cooldown";
import Logger from "@ssr/common/logger";
import { Player, PlayerModel } from "@ssr/common/model/player";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import {
  getScoreSaberLeaderboardFromToken,
  getScoreSaberScoreFromToken,
} from "@ssr/common/token-creators";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { formatDuration } from "@ssr/common/utils/time-utils";
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

const CONCURRENT_PAGES = 5;

export class PlayerRefreshService {
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
        priority: CooldownPriority.LOW,
      });

    if (!firstPage) {
      console.warn(`Failed to fetch scores for ${player._id} on page 1.`);
      result.timeTaken = performance.now() - startTime;
      return result;
    }

    const totalPages = Math.ceil(firstPage.metadata.total / 100);
    Logger.info(`Found ${totalPages} total pages for ${player._id}`);

    // Process the first page
    await Promise.all(
      firstPage.playerScores.map(async score => {
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
      })
    );

    // Process remaining pages in batches
    for (let batchStart = 2; batchStart <= totalPages; batchStart += CONCURRENT_PAGES) {
      const batchEnd = Math.min(batchStart + CONCURRENT_PAGES - 1, totalPages);
      Logger.info(
        `Processing pages ${batchStart} to ${batchEnd} concurrently for ${player._id}...`
      );

      const batchPromises = [];
      for (let page = batchStart; page <= batchEnd; page++) {
        batchPromises.push(
          (async () => {
            const scoresPage = await ApiServiceRegistry.getInstance()
              .getScoreSaberService()
              .lookupPlayerScores({
                playerId: player._id,
                page: page,
                limit: 100,
                sort: "recent",
                priority: CooldownPriority.LOW,
              });

            if (!scoresPage) {
              console.warn(`Failed to fetch scores for ${player._id} on page ${page}.`);
              return;
            }

            await Promise.all(
              scoresPage.playerScores.map(async score => {
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
              })
            );
          })()
        );
      }

      // Wait for all pages in the current batch to complete
      await Promise.all(batchPromises);
      Logger.info(`Completed batch ${batchStart} to ${batchEnd} for ${player._id}`);
    }

    if (!player.seededScores) {
      // Mark player as seeded
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
    for (let batchStart = 1; batchStart <= pages; batchStart += CONCURRENT_PAGES) {
      const batchEnd = Math.min(batchStart + CONCURRENT_PAGES - 1, pages);
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
}
