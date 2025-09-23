import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { CooldownPriority } from "@ssr/common/cooldown";
import Logger from "@ssr/common/logger";
import { ScoreSaberLeaderboardModel } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { getScoreSaberScoreFromToken } from "@ssr/common/token-creators";
import { LeaderboardService } from "../../service/leaderboard/leaderboard.service";
import { ScoreService } from "../../service/score/score.service";
import { Queue, QueueItem } from "../queue";
import { QueueId } from "../queue-manager";

export class LeaderboardScoreSeedQueue extends Queue<QueueItem<number>> {
  constructor() {
    super(QueueId.LeaderboardScoreSeedQueue, "fifo");

    setImmediate(async () => {
      // Always start processing the queue, regardless of whether it's empty or not
      await this.processQueue();

      const interval = setInterval(async () => {
        // If there are already items in the queue, don't add more
        if ((await this.getSize()) !== 0) {
          return;
        }
        const inserted = await this.insertLeaderboards();
        if (inserted === 0) {
          clearInterval(interval);
        }
      }, 10_000);
    });
  }

  protected async processItem(item: QueueItem<number>): Promise<void> {
    const leaderboardId = item.id;

    const leaderboardResponse = await LeaderboardService.getLeaderboard(leaderboardId);
    if (!leaderboardResponse) {
      Logger.warn(`Leaderboard "${leaderboardId}" not found`);
      return;
    }
    const leaderboard = leaderboardResponse.leaderboard;

    let currentPage = 1;
    let hasMoreScores = true;
		let consecutiveFailures = 0;
    let processedAnyScores = false;
    while (hasMoreScores) {
      const response = await ApiServiceRegistry.getInstance()
        .getScoreSaberService()
        .lookupLeaderboardScores(leaderboardId + "", currentPage, {
          priority: CooldownPriority.BACKGROUND,
        });
      if (!response) {
        Logger.warn(
          `Failed to fetch scoresaber api scores for leaderboard "${leaderboardId}" on page ${currentPage}`
        );
        consecutiveFailures++;
        // If we fail several pages in a row, abort this leaderboard to avoid spamming
        if (consecutiveFailures >= 3) {
          Logger.warn(
            `Aborting seeding for leaderboard "${leaderboardId}" after ${consecutiveFailures} consecutive failures at page ${currentPage}`
          );
          break;
        }
        currentPage++;
        continue;
      }
      const totalPages = Math.ceil(response.metadata.total / response.metadata.itemsPerPage);
      consecutiveFailures = 0;

      // Log every 10 pages, the first page, and the last page
      if (currentPage % 10 === 0 || currentPage === 1 || currentPage === totalPages) {
        Logger.info(
          `Fetched scores for leaderboard "${leaderboardId}" on page ${currentPage}/${totalPages}`
        );
      }

      for (const rawScore of response.scores) {
        const score = getScoreSaberScoreFromToken(rawScore, leaderboard, undefined);

        // Check if the score is already tracked
        const scoreExists = await ScoreService.scoreExistsByScoreId(score.scoreId);
        if (scoreExists) {
          processedAnyScores = true;
          continue;
        }

        await ScoreService.trackScoreSaberScore(score, leaderboard, score.playerInfo, false, false);
        processedAnyScores = true;
      }

      hasMoreScores = currentPage < totalPages;
      currentPage++;
    }

    // Update the seeded scores status only if we processed at least one score and did not abort immediately
    if (processedAnyScores) {
      await ScoreSaberLeaderboardModel.updateOne(
        { _id: leaderboardId },
        { $set: { seededScores: true } }
      );
      Logger.info(`Updated seeded scores status for leaderboard "${leaderboardId}"`);
    } else {
      Logger.warn(
        `Skipping seeded flag for leaderboard "${leaderboardId}" because no scores were processed`
      );
    }
  }

  /**
   * Inserts leaderboards that need to be seeded into the queue
   */
  private async insertLeaderboards(): Promise<number> {
    try {
      const leaderboards = await ScoreSaberLeaderboardModel.find({
        seededScores: { $in: [null, false] },
      })
        .select("_id")
        .limit(100)
        .sort({ ranked: 1, plays: 1 }) // Ranked first, then least plays
        .lean();
      const leaderboardIds = leaderboards.map(p => p._id);
      if (leaderboardIds.length === 0) {
        Logger.info("No leaderboard to seed scores for");
        return 0;
      }

      for (const leaderboardId of leaderboardIds) {
        await this.add({ id: leaderboardId.toString(), data: leaderboardId });
      }

      Logger.info(`Added ${leaderboardIds.length} leaderboards to score seed queue`);
      return leaderboardIds.length;
    } catch (error) {
      Logger.error("Failed to load unseeded leaderboards:", error);
      return 0;
    }
  }
}
