import Logger from "@ssr/common/logger";
import { getScoreSaberScoreFromToken } from "@ssr/common/token-creators";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { asc, count, eq } from "drizzle-orm";
import { db } from "../../db";
import { scoreSaberLeaderboardsTable, scoreSaberScoresTable } from "../../db/schema";
import { LeaderboardCoreService } from "../../service/leaderboard/leaderboard-core.service";
import { ScoreCoreService } from "../../service/score/score-core.service";
import { ScoreSaberApiService } from "../../service/scoresaber-api.service";
import { Queue, QueueItem } from "../queue";
import { QueueId } from "../queue-manager";

export class LeaderboardScoreSeedQueue extends Queue<QueueItem<number>> {
  constructor() {
    super(QueueId.LeaderboardScoreSeedQueue, "lifo");

    setImmediate(() => this.insertLeaderboards());
    setInterval(() => this.insertLeaderboards(), TimeUnit.toMillis(TimeUnit.Second, 10));
  }

  protected async processItem(item: QueueItem<number>): Promise<void> {
    const leaderboardId = Number(item.id);

    const leaderboard = await LeaderboardCoreService.getLeaderboard(leaderboardId);
    const totalTrackedScores =
      (
        await db
          .select({ count: count() })
          .from(scoreSaberScoresTable)
          .where(eq(scoreSaberScoresTable.leaderboardId, leaderboardId))
      )[0]?.count ?? 0;

    const firstPage = await ScoreSaberApiService.lookupLeaderboardScores(leaderboardId, 1);
    if (firstPage && totalTrackedScores >= firstPage.metadata.total) {
      Logger.warn(`Skipping leaderboard "${leaderboardId}" because it already has all scores tracked`);
      await this.markLeaderboardSeeded(leaderboardId);
      return;
    }

    let consecutiveFailures = 0;
    let newScoresTracked = 0;
    let scrape = true;
    let page = 1;

    while (scrape) {
      const response =
        page === 1 && firstPage
          ? firstPage
          : await ScoreSaberApiService.lookupLeaderboardScores(leaderboardId, page);
      if (!response) {
        Logger.warn(`Failed to fetch scores for leaderboard "${leaderboardId}" on page ${page}`);
        consecutiveFailures++;
        if (consecutiveFailures >= 2) {
          Logger.warn(`Aborting leaderboard "${leaderboardId}" after 2 consecutive page failures`);
          break;
        }
        continue;
      }

      const totalPages = Math.ceil(response.metadata.total / response.metadata.itemsPerPage);
      consecutiveFailures = 0;

      if (page % 10 === 0 || page === 1 || page === totalPages) {
        Logger.info(`Fetching scores for leaderboard "${leaderboardId}" on page ${page}/${totalPages}`);
      }

      await Promise.all(
        response.scores.map(async rawScore => {
          const score = getScoreSaberScoreFromToken(rawScore, leaderboard, undefined);
          if (await ScoreCoreService.scoreExists(score.scoreId)) {
            return;
          }
          await ScoreCoreService.trackScoreSaberScore(score, undefined, leaderboard, false);
          newScoresTracked++;
        })
      );

      if (page === totalPages) {
        scrape = false;
      }
      page++;
    }

    await this.markLeaderboardSeeded(leaderboardId);
    Logger.info(
      `Updated seeded scores status for leaderboard "${leaderboardId}" and tracked ${newScoresTracked} new scores`
    );
  }

  private async markLeaderboardSeeded(leaderboardId: number): Promise<void> {
    await db
      .update(scoreSaberLeaderboardsTable)
      .set({ seededScores: true })
      .where(eq(scoreSaberLeaderboardsTable.id, leaderboardId));
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
        .limit(500);

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
