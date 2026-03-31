import Logger from "@ssr/common/logger";
import { getScoreSaberScoreFromToken } from "@ssr/common/token-creators";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { asc, eq } from "drizzle-orm";
import { db } from "../../db";
import { scoreSaberLeaderboardsTable } from "../../db/schema";
import { LeaderboardCoreService } from "../../service/leaderboard/leaderboard-core.service";
import { ScoreCoreService } from "../../service/score/score-core.service";
import { ScoreSaberApiService } from "../../service/scoresaber-api.service";
import { Queue, QueueItem } from "../queue";
import { QueueId } from "../queue-manager";

export class LeaderboardScoreSeedQueue extends Queue<QueueItem<number>> {
  constructor() {
    super(QueueId.LeaderboardScoreSeedQueue, "lifo");

    setImmediate(() => this.insertLeaderboards());
    setInterval(() => this.insertLeaderboards(), TimeUnit.toMillis(TimeUnit.Minute, 1));
  }

  protected async processItem(item: QueueItem<number>): Promise<void> {
    const leaderboardId = Number(item.id);

    const leaderboard = await LeaderboardCoreService.getLeaderboard(leaderboardId);

    let currentPage = 1;
    let hasMoreScores = true;
    let processedAnyScores = false;
    let lastSuccessfulPage = 1;
    while (hasMoreScores) {
      const response = await ScoreSaberApiService.lookupLeaderboardScores(
        Number(leaderboardId),
        currentPage
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

      await Promise.all(
        response.scores.map(async (rawScore) => {
          const score = getScoreSaberScoreFromToken(rawScore, leaderboard, undefined);
          const scoreExists = await ScoreCoreService.scoreExists(score.scoreId);
          if (scoreExists) {
            processedAnyScores = true;
            return;
          }

          await ScoreCoreService.trackScoreSaberScore(score, undefined, leaderboard, false);
          processedAnyScores = true;
        })
      );

      hasMoreScores = currentPage < totalPages;
      currentPage++;
      lastSuccessfulPage = currentPage;
    }

    // Update the seeded scores status only if we processed at least one score
    if (processedAnyScores) {
      await db
        .update(scoreSaberLeaderboardsTable)
        .set({ seededScores: true })
        .where(eq(scoreSaberLeaderboardsTable.id, leaderboardId));
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
      const leaderboards = await db
        .select({ id: scoreSaberLeaderboardsTable.id })
        .from(scoreSaberLeaderboardsTable)
        .where(eq(scoreSaberLeaderboardsTable.seededScores, false))
        .orderBy(asc(scoreSaberLeaderboardsTable.plays))
        .limit(100);

      const leaderboardIds = leaderboards.map(l => l.id);
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
