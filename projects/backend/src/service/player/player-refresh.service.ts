import Logger from "@ssr/common/logger";
import { PlayerDocument, PlayerModel } from "@ssr/common/model/player";
import { ScoreSort } from "@ssr/common/score/score-sort";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { ScoreService } from "../score/score.service";
import ScoreSaberService from "../scoresaber/scoresaber.service";
import { PlayerCoreService } from "./player-core.service";
import { PlayerHistoryService } from "./player-history.service";

export class PlayerRefreshService {
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

    const firstPage = await scoresaberService.lookupPlayers(1);
    if (firstPage == undefined) {
      Logger.error("Failed to fetch players on page 1, skipping player statistics update...");
      return;
    }

    const pages = Math.ceil(firstPage.metadata.total / (firstPage.metadata.itemsPerPage ?? 100));
    Logger.info(`Fetching ${pages} pages of players from ScoreSaber...`);

    const PLAYER_TIMEOUT = 30000;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 1; i <= pages; i++) {
      if (i > 400) {
        break;
      }

      Logger.info(`Fetching page ${i}...`);
      const page = await scoresaberService.lookupPlayers(i);

      if (page == undefined) {
        Logger.error(`Failed to fetch players on page ${i}, skipping page...`);
        errorCount++;
        continue;
      }

      callback?.(i, pages, successCount, errorCount);
      Logger.info(`Processing page ${i} with ${page.players.length} players...`);

      // Separate players into seeded and unseeded
      const seededPlayers: typeof page.players = [];
      const unseededPlayers: typeof page.players = [];

      // Check each player's seeding status
      for (const player of page.players) {
        const foundPlayer = await PlayerModel.findById(player.id);
        if (foundPlayer?.seededScores) {
          seededPlayers.push(player);
        } else {
          unseededPlayers.push(player);
        }
      }

      // Process seeded players in parallel
      if (seededPlayers.length > 0) {
        Logger.info(`Processing ${seededPlayers.length} seeded players in parallel...`);
        await Promise.all(
          seededPlayers.map(async player => {
            try {
              const timeoutPromise = new Promise((_, reject) => {
                setTimeout(
                  () => reject(new Error(`Timeout processing player ${player.id}`)),
                  PLAYER_TIMEOUT
                );
              });

              const processPromise = (async () => {
                const foundPlayer = await PlayerCoreService.getPlayer(player.id, true, player);
                await PlayerHistoryService.trackScoreSaberPlayer(foundPlayer, now, player);
                successCount++;
              })();

              await Promise.race([processPromise, timeoutPromise]);
            } catch (error) {
              Logger.error(`Failed to track seeded player ${player.id} (${player.name}): ${error}`);
              errorCount++;
            }
          })
        );
      }

      // Process unseeded players sequentially
      if (unseededPlayers.length > 0) {
        Logger.info(`Processing ${unseededPlayers.length} unseeded players sequentially...`);
        for (const player of unseededPlayers) {
          try {
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(
                () => reject(new Error(`Timeout processing player ${player.id}`)),
                PLAYER_TIMEOUT
              );
            });

            const processPromise = (async () => {
              const foundPlayer = await PlayerCoreService.getPlayer(player.id, true, player);
              await PlayerHistoryService.trackScoreSaberPlayer(foundPlayer, now, player);
              successCount++;
            })();

            await Promise.race([processPromise, timeoutPromise]);
          } catch (error) {
            Logger.error(`Failed to track unseeded player ${player.id} (${player.name}): ${error}`);
            errorCount++;
          }
        }
      }

      Logger.info(`Completed page ${i}`);
    }

    Logger.info(
      `Finished tracking player statistics in ${(performance.now() - now.getTime()).toFixed(0)}ms\n` +
        `Successfully processed: ${successCount} players\n` +
        `Failed to process: ${errorCount} players`
    );
  }
}
