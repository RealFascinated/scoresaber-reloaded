import Logger from "@ssr/common/logger";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { formatDuration, TimeUnit } from "@ssr/common/utils/time-utils";
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { scoreSaberScoreEventTable } from "../../db/schema";

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
   * Updates the trending leaderboards.
   * This sorts the leaderboards by the amount of unique plays in the
   * last week and gives them a score based on the amount of plays.
   */
  public static async updateTrendingLeaderboards(): Promise<void> {
    const before = performance.now();
    const oneWeekAgo = new Date(Date.now() - TimeUnit.toMillis(TimeUnit.Week, 1));

    await db.execute(sql`
      WITH agg AS (
        SELECT
          events."leaderboardId" AS leaderboard_id,
          count(DISTINCT events."playerId")::int AS unique_players_7d,
          count(*)::int AS plays_7d
        FROM "scoresaber-score-events" AS events
        WHERE events."timestamp" >= ${oneWeekAgo}
        GROUP BY events."leaderboardId"
      )
      UPDATE "scoresaber-leaderboards" AS leaderboards
      SET "trendingScore" =
        (agg.unique_players_7d * 1000 + agg.plays_7d)::double precision
      FROM agg
      WHERE leaderboards."id" = agg.leaderboard_id
    `);

    await db.execute(sql`
      UPDATE "scoresaber-leaderboards" AS leaderboards
      SET "trendingScore" = 0
      WHERE leaderboards."trendingScore" <> 0
        AND NOT EXISTS (
          SELECT 1
          FROM "scoresaber-score-events" AS events
          WHERE events."leaderboardId" = leaderboards."id"
            AND events."timestamp" >= ${oneWeekAgo}
        )
    `);

    Logger.info(`Updated leaderboard trending scores in ${formatDuration(performance.now() - before)}`);
  }

  /**
   * Recomputes and updates daily plays for all leaderboards using events from the last 24 hours.
   */
  public static async updateLeaderboardDailyPlays(): Promise<void> {
    const before = performance.now();
    const oneDayAgo = new Date(Date.now() - TimeUnit.toMillis(TimeUnit.Day, 1));

    await db.execute(sql`
      WITH agg AS (
        SELECT
          events."leaderboardId" AS leaderboard_id,
          count(*)::int AS plays_24h
        FROM "scoresaber-score-events" AS events
        WHERE events."timestamp" >= ${oneDayAgo}
        GROUP BY events."leaderboardId"
      )
      UPDATE "scoresaber-leaderboards" AS leaderboards
      SET "dailyPlays" = agg.plays_24h
      FROM agg
      WHERE leaderboards."id" = agg.leaderboard_id
    `);

    await db.execute(sql`
      UPDATE "scoresaber-leaderboards" AS leaderboards
      SET "dailyPlays" = 0
      WHERE leaderboards."dailyPlays" <> 0
        AND NOT EXISTS (
          SELECT 1
          FROM "scoresaber-score-events" AS events
          WHERE events."leaderboardId" = leaderboards."id"
            AND events."timestamp" >= ${oneDayAgo}
        )
    `);

    Logger.info(`Updated leaderboard daily plays in ${formatDuration(performance.now() - before)}`);
  }
}
