import Logger, { type ScopedLogger } from "@ssr/common/logger";
import { getScoreSaberScoreFromToken } from "@ssr/common/token-creators";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { asc, eq } from "drizzle-orm";
import { db } from "../../db";
import { scoreSaberLeaderboardsTable } from "../../db/schema";
import { ScoreSaberApiService } from "../../service/external/scoresaber-api.service";
import { ScoreSaberLeaderboardsService } from "../../service/leaderboard/scoresaber-leaderboards.service";
import { PlayerMedalsService } from "../../service/medals/player-medals.service";
import { PlayerCoreService } from "../../service/player/player-core.service";
import { ScoreCoreService } from "../../service/score/score-core.service";
import { Queue, QueueItem } from "../queue";
import { QueueId } from "../queue-manager";

export class LeaderboardScoreSeedQueue extends Queue<QueueItem<number>> {
  private static readonly logger: ScopedLogger = Logger.withTopic("Leaderboard Score Seed Queue");

  constructor() {
    super(QueueId.LeaderboardScoreSeedQueue, "fifo", 10);

    setImmediate(() => this.insertLeaderboards());
    setInterval(() => this.insertLeaderboards(), TimeUnit.toMillis(TimeUnit.Minute, 10));
  }

  protected async processItem(item: QueueItem<number>): Promise<void> {
    const leaderboardId = Number(item.id);
    const leaderboard = await ScoreSaberLeaderboardsService.getLeaderboard(leaderboardId);

    let newScoresTracked = 0;
    let currentPbReplaced = 0;

    let consecutiveFailures = 0;
    let scrape = true;
    let page = 1;
    let lastSeenTotalPages: number | undefined;
    // Whether every page up to the last one was fetched. Cleared when a page is
    // skipped or the scrape is aborted so the leaderboard is not marked seeded
    // and the next 10-minute cycle retries it.
    let fullySeeded = true;

    while (scrape) {
      const response = await ScoreSaberApiService.lookupLeaderboardScores(leaderboardId, page);
      if (!response) {
        consecutiveFailures++;
        if (consecutiveFailures >= 2) {
          if (lastSeenTotalPages !== undefined && page < lastSeenTotalPages) {
            LeaderboardScoreSeedQueue.logger.warn(
              `Failed to fetch page ${page} for leaderboard "${leaderboardId}" after 2 attempts; skipping this page and continuing (leaderboard may be incompletely seeded)`
            );
            consecutiveFailures = 0;
            fullySeeded = false;
            page++;
            continue;
          }
          LeaderboardScoreSeedQueue.logger.warn(
            `Aborting leaderboard "${leaderboardId}" after 2 consecutive page failures (page ${page}${lastSeenTotalPages !== undefined ? ` of ${lastSeenTotalPages}` : ""})`
          );
          fullySeeded = false;
          break;
        }
        LeaderboardScoreSeedQueue.logger.warn(
          `Tried to get page ${page} for leaderboard "${leaderboardId}" and failed`
        );
        continue;
      }

      // An empty leaderboard has totalPages 0; the loop must still terminate
      // (see the page >= max(1, totalPages) check below) instead of fetching
      // out-of-range pages forever.
      const totalPages = Math.ceil(response.metadata.total / Math.max(1, response.metadata.itemsPerPage));
      lastSeenTotalPages = totalPages;
      consecutiveFailures = 0;

      if (page % 100 === 0 || page === 1 || page === totalPages) {
        LeaderboardScoreSeedQueue.logger.info(
          `Fetching scores for leaderboard "${leaderboardId}" on page ${page}/${totalPages}`
        );
      }

      const parsedScores = response.scores.map(rawScore =>
        getScoreSaberScoreFromToken(rawScore, leaderboard, undefined)
      );
      await Promise.all(
        parsedScores.map(async score => {
          // The player's account must exist before their score rows are written,
          // so wait for creation (a no-op when the account is already tracked).
          await PlayerCoreService.createIfMissing(score.playerId);

          const trackingResult = await ScoreCoreService.trackScoreSaberScore(
            score,
            leaderboard,
            false,
            undefined,
            {
              skipDuplicateCheck: true,
            }
          );
          if (trackingResult.tracked) {
            newScoresTracked++;
            if (trackingResult.hasPreviousScore) {
              currentPbReplaced++;
            }
          }
        })
      );

      // Treat an empty leaderboard (totalPages 0) as complete after its first
      // page, and terminate on or after the last page.
      if (page >= Math.max(1, totalPages)) {
        scrape = false;
      }
      page++;
    }

    await PlayerMedalsService.refreshLeaderboardMedals(leaderboard);

    if (!fullySeeded) {
      LeaderboardScoreSeedQueue.logger.warn(
        `Leaderboard "${leaderboardId}" was not fully seeded; leaving it unseeded so the next cycle retries it`
      );
      return;
    }

    await this.markLeaderboardSeeded(leaderboardId);
    LeaderboardScoreSeedQueue.logger.info(
      `Updated seeded scores status for leaderboard "${leaderboardId}" tracked ${newScoresTracked} scores (${currentPbReplaced} current PB replacements)`
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
    if ((await this.getSize()) !== 0 || this.getActiveWorkers() > 0) {
      return;
    }
    try {
      const leaderboards = await db
        .select({ id: scoreSaberLeaderboardsTable.id })
        .from(scoreSaberLeaderboardsTable)
        .where(eq(scoreSaberLeaderboardsTable.seededScores, false))
        .orderBy(asc(scoreSaberLeaderboardsTable.plays));

      const leaderboardIds = leaderboards.map(l => l.id);
      if (leaderboardIds.length === 0) {
        LeaderboardScoreSeedQueue.logger.info("No leaderboard to seed scores for");
        return;
      }

      for (const leaderboardId of leaderboardIds) {
        await this.add({ id: leaderboardId.toString(), data: leaderboardId });
      }

      await this.processQueue(); // Process the queue immediately
      LeaderboardScoreSeedQueue.logger.info(
        `Added ${leaderboardIds.length} leaderboards to score seed queue`
      );
    } catch (error) {
      LeaderboardScoreSeedQueue.logger.error("Failed to load unseeded leaderboards:", error);
      return;
    }
  }
}
