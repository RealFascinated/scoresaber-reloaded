import { CooldownPriority } from "@ssr/common/cooldown";
import Logger from "@ssr/common/logger";
import { ScoreSaberLeaderboardModel } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { getScoreSaberScoreFromToken } from "@ssr/common/token-creators";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { LeaderboardCoreService } from "../../service/leaderboard/leaderboard-core.service";
import { ScoreCoreService } from "../../service/score/score-core.service";
import { ScoreSaberApiService } from "../../service/scoresaber-api.service";
import { Queue, QueueItem } from "../queue";
import { QueueId } from "../queue-manager";

export class LeaderboardScoreSeedQueue extends Queue<QueueItem<number>> {
  constructor() {
    super(QueueId.LeaderboardScoreSeedQueue, "lifo");

    setImmediate(() => this.insertLeaderboards());
    setInterval(() => this.insertLeaderboards(), TimeUnit.toMillis(TimeUnit.Hour, 1));
  }

  protected async processItem(item: QueueItem<number>): Promise<void> {
    const leaderboardId = Number(item.id);

    const leaderboardResponse = await LeaderboardCoreService.getLeaderboard(leaderboardId);
    if (!leaderboardResponse) {
      Logger.warn(`Leaderboard "${leaderboardId}" not found`);
      return;
    }
    const leaderboard = leaderboardResponse.leaderboard;

    let currentPage = 1;
    let hasMoreScores = true;
    let processedAnyScores = false;
    let lastSuccessfulPage = 1;
    while (hasMoreScores) {
      const response = await ScoreSaberApiService.lookupLeaderboardScores(
        Number(leaderboardId),
        currentPage,
        {
          priority: CooldownPriority.BACKGROUND,
        }
      );
      if (!response) {
        Logger.warn(
          `Failed to fetch scoresaber api scores for leaderboard "${leaderboardId}" on page ${currentPage}`
        );
        currentPage++;

        if (currentPage > lastSuccessfulPage + 5) {
          Logger.warn(`Skipping leaderboard "${leaderboardId}" because it has too many failed pages`);
          processedAnyScores = true;
          break;
        }
        continue;
      }
      const totalPages = Math.ceil(response.metadata.total / response.metadata.itemsPerPage);

      // Log every 10 pages, the first page, and the last page
      if (currentPage % 10 === 0 || currentPage === 1 || currentPage === totalPages) {
        Logger.info(`Fetched scores for leaderboard "${leaderboardId}" on page ${currentPage}/${totalPages}`);
      }

      for (const rawScore of response.scores) {
        const score = getScoreSaberScoreFromToken(rawScore, leaderboard, undefined);

        // Check if the score is already tracked
        const scoreExists = await ScoreCoreService.scoreExists(score.scoreId);
        if (scoreExists) {
          processedAnyScores = true;
          continue;
        }

        await ScoreCoreService.trackScoreSaberScore(score, leaderboard, score.playerInfo, undefined, false);
        processedAnyScores = true;
      }

      hasMoreScores = currentPage < totalPages;
      currentPage++;
      lastSuccessfulPage = currentPage;
    }

    // Update the seeded scores status only if we processed at least one score
    if (processedAnyScores) {
      await LeaderboardCoreService.updateLeaderboard(leaderboardId, { seededScores: true });
      Logger.info(`Updated seeded scores status for leaderboard "${leaderboardId}"`);
    } else {
      Logger.warn(`Skipping seeded flag for leaderboard "${leaderboardId}" because no scores were processed`);
    }
  }

  /**
   * Inserts leaderboards that need to be seeded into the queue
   */
  private async insertLeaderboards() {
    // If there are already items in the queue, don't add more
    if ((await this.getSize()) !== 0) {
      return;
    }
    try {
      const leaderboards = await ScoreSaberLeaderboardModel.find({
        seededScores: { $in: [null, false] },
      })
        .select("_id")
        .sort({ ranked: -1, plays: 1 }) // Ranked first, then least plays
        .lean();
      const leaderboardIds = leaderboards.map(p => p._id);
      if (leaderboardIds.length === 0) {
        Logger.info("No leaderboard to seed scores for");
        return;
      }

      for (const leaderboardId of leaderboardIds) {
        await this.add({ id: leaderboardId.toString(), data: leaderboardId });
      }

      await this.processQueue(); // Process the queue immediately
      Logger.info(`Added ${leaderboardIds.length} leaderboards to score seed queue`);
    } catch (error) {
      Logger.error("Failed to load unseeded leaderboards:", error);
      return;
    }
  }
}
