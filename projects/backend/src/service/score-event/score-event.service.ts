import Logger from "@ssr/common/logger";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { formatDuration, TimeUnit } from "@ssr/common/utils/time-utils";
import { isProduction } from "@ssr/common/utils/utils";
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { scoreSaberScoreEventTable } from "../../db/schema";

export class ScoreEventService {
  /** Trending looks at the last 7 days; one extra day keeps a margin for clock and cron drift. */
  private static readonly RETENTION_DAYS = 8;
  private static readonly PURGE_BATCH_SIZE = 50_000;

  /** How quickly a player's contribution fades; at 48h an old play counts half as much. */
  private static readonly TRENDING_HALF_LIFE_HOURS = 48;
  /** The "now" window compared against the rest of the week to detect growth. */
  private static readonly TRENDING_RECENT_DAYS = 2;
  /** Added to both daily rates so tiny maps can't produce huge ratios. */
  private static readonly TRENDING_SMOOTHING = 5;
  private static readonly TRENDING_MIN_MOMENTUM = 0.5;
  private static readonly TRENDING_MAX_MOMENTUM = 3;

  /**
   * Inserts a score event.
   *
   * @param score the score to insert the event for.
   */
  public static async insertScoreEvent(score: ScoreSaberScore): Promise<void> {
    if (!isProduction()) {
      return;
    }

    await db.insert(scoreSaberScoreEventTable).values({
      playerId: score.playerId,
      leaderboardId: score.leaderboardId,
      timestamp: score.timestamp,
    });
  }

  /**
   * Deletes score events older than the retention window. Trending needs the last 7 days, so
   * anything older is dead weight that only slows down inserts and the aggregation queries.
   * Deletes in batches so the first run on a large backlog doesn't hold one huge transaction.
   *
   * @returns how many events were deleted
   */
  public static async purgeOldEvents(): Promise<number> {
    const before = performance.now();
    const cutoff = new Date(Date.now() - TimeUnit.toMillis(TimeUnit.Day, ScoreEventService.RETENTION_DAYS));

    let deleted = 0;
    for (;;) {
      const result = await db.execute(sql`
        DELETE FROM "scoresaber-score-events"
        WHERE "id" IN (
          SELECT "id" FROM "scoresaber-score-events"
          WHERE "timestamp" < ${cutoff}
          LIMIT ${ScoreEventService.PURGE_BATCH_SIZE}
        )
      `);
      const count = result.rowCount ?? 0;
      deleted += count;
      if (count < ScoreEventService.PURGE_BATCH_SIZE) {
        break;
      }
    }

    if (deleted > 0) {
      Logger.info(
        `Purged ${deleted} score events older than ${ScoreEventService.RETENTION_DAYS} days in ${formatDuration(performance.now() - before)}`
      );
    }
    return deleted;
  }

  /**
   * Updates the trending leaderboards.
   *
   * The score is `100 * ln(1 + recencyWeightedPlayers) * momentum`:
   * - recencyWeightedPlayers: each unique player in the last 7 days counts once, weighted by how
   *   recently they last played (half-life of {@link TRENDING_HALF_LIFE_HOURS} hours), so a map
   *   that peaked days ago fades out. Repeat plays by one player never add extra weight.
   * - ln(): damps raw popularity so evergreen maps don't permanently dominate.
   * - momentum: smoothed ratio of the last {@link TRENDING_RECENT_DAYS} days' daily players against
   *   the daily players of the rest of the week, clamped. The smoothing constant acts as a volume
   *   floor so a map going from 1 to 3 players doesn't count as a breakout.
   */
  public static async updateTrendingLeaderboards(): Promise<void> {
    const before = performance.now();
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - TimeUnit.toMillis(TimeUnit.Week, 1));
    const recentCutoff = new Date(
      now.getTime() - TimeUnit.toMillis(TimeUnit.Day, ScoreEventService.TRENDING_RECENT_DAYS)
    );
    const halfLifeSeconds = ScoreEventService.TRENDING_HALF_LIFE_HOURS * 3600;
    const baselineDays = 7 - ScoreEventService.TRENDING_RECENT_DAYS;

    await db.execute(sql`
      WITH per_player AS (
        SELECT
          events."leaderboardId" AS leaderboard_id,
          events."playerId" AS player_id,
          max(events."timestamp") AS last_played,
          bool_or(events."timestamp" >= ${recentCutoff}) AS in_recent,
          bool_or(events."timestamp" < ${recentCutoff}) AS in_baseline
        FROM "scoresaber-score-events" AS events
        WHERE events."timestamp" >= ${oneWeekAgo}
        GROUP BY events."leaderboardId", events."playerId"
      ),
      agg AS (
        SELECT
          leaderboard_id,
          sum(power(0.5, extract(epoch FROM (${now}::timestamp - last_played)) / ${halfLifeSeconds}::double precision)) AS weighted_players,
          count(*) FILTER (WHERE in_recent) AS recent_players,
          count(*) FILTER (WHERE in_baseline) AS baseline_players
        FROM per_player
        GROUP BY leaderboard_id
      ),
      scored AS (
        SELECT
          leaderboard_id,
          (
            100 * ln(1 + weighted_players)
            * least(
                ${ScoreEventService.TRENDING_MAX_MOMENTUM}::double precision,
                greatest(
                  ${ScoreEventService.TRENDING_MIN_MOMENTUM}::double precision,
                  (recent_players / ${ScoreEventService.TRENDING_RECENT_DAYS}::double precision + ${ScoreEventService.TRENDING_SMOOTHING}::double precision)
                    / (baseline_players / ${baselineDays}::double precision + ${ScoreEventService.TRENDING_SMOOTHING}::double precision)
                )
              )
          )::double precision AS score
        FROM agg
      )
      UPDATE "scoresaber-leaderboards" AS leaderboards
      SET "trendingScore" = scored.score
      FROM scored
      WHERE leaderboards."id" = scored.leaderboard_id
        AND leaderboards."trendingScore" IS DISTINCT FROM scored.score
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
        AND leaderboards."dailyPlays" IS DISTINCT FROM agg.plays_24h
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
