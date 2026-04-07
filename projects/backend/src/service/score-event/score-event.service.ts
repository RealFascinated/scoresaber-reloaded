import Logger from "@ssr/common/logger";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { formatDuration, TimeUnit } from "@ssr/common/utils/time-utils";
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { scoreSaberLeaderboardsTable, scoreSaberScoreEventTable } from "../../db/schema";

export class ScoreEventService {
  /**
   * Inserts a score event.
   *
   * @param score the score to insert the event for.
   */
  public static async insertScoreEvent(score: ScoreSaberScore): Promise<void> {
    await db.insert(scoreSaberScoreEventTable).values({
      playerId: score.playerId,
      leaderboardId: score.leaderboardId,
      timestamp: score.timestamp,
    });
  }

  /**
   * Recomputes and updates daily plays for all leaderboards using events from the last 24 hours.
   */
  public static async updateLeaderboardDailyPlays(): Promise<void> {
    const before = performance.now();
    await db.update(scoreSaberLeaderboardsTable).set({
      dailyPlays: sql<number>`(
        SELECT count(*)
        FROM ${scoreSaberScoreEventTable} AS events
        WHERE events.${scoreSaberScoreEventTable.leaderboardId} = ${scoreSaberLeaderboardsTable.id}
          AND events.${scoreSaberScoreEventTable.timestamp} >= ${new Date(Date.now() - TimeUnit.toMillis(TimeUnit.Day, 1))}
      )`,
    });
    Logger.info(`Updated leaderboard daily plays in ${formatDuration(performance.now() - before)}`);
  }
}
