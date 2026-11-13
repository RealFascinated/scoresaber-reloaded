import { MEDAL_COUNTS, MEDAL_RANKS } from "@ssr/common/medal";
import type { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { and, asc, count, desc, eq, gt, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { db } from "../db";
import { descNullsLast } from "../db/order";
import { scoreSaberAccountsTable, scoreSaberScoresTable } from "../db/schema";

function sqlMedalPointsCase(rnColumnIdentifier: string) {
  const whens = MEDAL_RANKS.map(rank => sql`WHEN ${rank}::int THEN ${MEDAL_COUNTS[rank]}::int`);
  return sql`CASE ${sql.raw(rnColumnIdentifier)} ${sql.join(whens, sql` `)} ELSE 0 END`;
}

function distinctPlayerIds(result: unknown): string[] {
  const rows = (result as { rows?: { playerId: string }[] }).rows ?? [];
  return [...new Set(rows.map(r => r.playerId))];
}

export class ScoreSaberMedalsRepository {
  public static async updateMedalsOnRankedLeaderboard(leaderboard: ScoreSaberLeaderboard): Promise<void> {
    if (!leaderboard.ranked) {
      return;
    }
    await db.execute(ScoreSaberMedalsRepository.rankedLeaderboardMedalsUpdateSql(leaderboard.id, false));
  }

  private static rankedLeaderboardMedalsUpdateSql(leaderboardId: number, returnPlayerIds: boolean) {
    return sql`
        WITH top10_rows AS MATERIALIZED (
          SELECT s."scoreId", s.score
          FROM "scoresaber-scores" s
          INNER JOIN "scoresaber-accounts" a ON a.id = s."playerId" AND a.banned = false
          WHERE s."leaderboardId" = ${leaderboardId}
          ORDER BY s.score DESC NULLS LAST, s."scoreId" DESC NULLS LAST
          LIMIT 10
        ),
        top10 AS (
          SELECT
            r."scoreId",
            ROW_NUMBER() OVER (ORDER BY r.score DESC NULLS LAST, r."scoreId" DESC NULLS LAST)::int AS rn
          FROM top10_rows AS r
        ),
        stale AS (
          SELECT s."scoreId"
          FROM "scoresaber-scores" s
          WHERE s."leaderboardId" = ${leaderboardId}
            AND s.medals <> 0
        ),
        medal_map AS (
          SELECT
            t10."scoreId",
            ${sqlMedalPointsCase("t10.rn")} AS medal
          FROM top10 AS t10
          UNION ALL
          SELECT st."scoreId", 0 AS medal
          FROM stale AS st
          WHERE NOT EXISTS (SELECT 1 FROM top10 AS t WHERE t."scoreId" = st."scoreId")
        )
        UPDATE "scoresaber-scores" AS u
        SET medals = mm.medal
        FROM medal_map AS mm
        WHERE u."scoreId" = mm."scoreId"
          AND u.medals IS DISTINCT FROM mm.medal
        ${returnPlayerIds ? sql`RETURNING u."playerId" AS "playerId"` : sql``}
      `;
  }

  public static async updateMedalsOnLeaderboard(leaderboard: ScoreSaberLeaderboard): Promise<string[]> {
    if (!leaderboard.ranked) {
      return [];
    }

    // A single statement is already atomic, so no explicit transaction (saves BEGIN/COMMIT round trips)
    const updated = await db.execute(
      ScoreSaberMedalsRepository.rankedLeaderboardMedalsUpdateSql(leaderboard.id, true)
    );
    return distinctPlayerIds(updated);
  }

  public static async selectPlayerIdsAffectedByMedalUpdate(
    leaderboard: ScoreSaberLeaderboard
  ): Promise<string[]> {
    if (!leaderboard.ranked) {
      return [];
    }

    const result = await db.execute(sql`
      WITH top10 AS (
        SELECT s."playerId"
        FROM "scoresaber-scores" s
        INNER JOIN "scoresaber-accounts" a ON a.id = s."playerId" AND a.banned = false
        WHERE s."leaderboardId" = ${leaderboard.id}
        ORDER BY s.score DESC NULLS LAST, s."scoreId" DESC NULLS LAST
        LIMIT 10
      )
      SELECT DISTINCT u."playerId" AS "playerId"
      FROM (
        SELECT "playerId" FROM top10
        UNION
        SELECT s."playerId"
        FROM "scoresaber-scores" s
        WHERE s."leaderboardId" = ${leaderboard.id}
          AND s.medals <> 0
      ) AS u
    `);
    return distinctPlayerIds(result);
  }

  public static async getMedalTableScoreRanksForScores(
    targets: { scoreId: number; leaderboardId: number }[]
  ): Promise<Map<number, number>> {
    if (targets.length === 0) {
      return new Map();
    }
    const leaderboardIds = [...new Set(targets.map(t => t.leaderboardId))];
    const scoreIds = targets.map(t => t.scoreId);

    const result = await db.execute(sql`
      WITH ranked AS (
        SELECT
          s."scoreId",
          cast(
            row_number() over (
              partition by s."leaderboardId"
              order by
                s.medals desc,
                s.timestamp desc,
                s."scoreId" desc
            ) as integer
          ) AS rank
        FROM "scoresaber-scores" s
        INNER JOIN "scoresaber-accounts" a ON a.id = s."playerId" AND a.banned = false
        WHERE s."leaderboardId" IN (${sql.join(
          leaderboardIds.map(id => sql`${id}`),
          sql`, `
        )})
          AND s.medals > 0
      )
      SELECT "scoreId", rank FROM ranked
      WHERE "scoreId" IN (${sql.join(
        scoreIds.map(id => sql`${id}`),
        sql`, `
      )})
    `);

    const rows = (result as unknown as { rows: { scoreId: number; rank: number }[] }).rows ?? [];
    return new Map(rows.map(r => [Number(r.scoreId), Number(r.rank)]));
  }

  public static async selectIdAndMedalsByIds(
    ids: string[]
  ): Promise<{ id: string; medals: number | null }[]> {
    if (ids.length === 0) {
      return [];
    }
    return db
      .select({ id: scoreSaberAccountsTable.id, medals: scoreSaberAccountsTable.medals })
      .from(scoreSaberAccountsTable)
      .where(inArray(scoreSaberAccountsTable.id, ids));
  }

  public static async syncGlobalMedalTotalsFromScoresTable(): Promise<void> {
    await db.transaction(async tx => {
      // Accounts that no longer have any (counted) medals drop to 0. Done only for accounts that
      // actually need it, instead of zeroing every medal holder and writing them all back again.
      await tx.execute(sql`
        UPDATE "scoresaber-accounts" AS a
        SET medals = 0
        WHERE a.medals > 0
          AND NOT EXISTS (
            SELECT 1
            FROM "scoresaber-scores" s
            WHERE s."playerId" = a.id AND s.medals > 0 AND a.banned = false
          )
      `);

      await tx.execute(sql`
        UPDATE "scoresaber-accounts" AS a
        SET medals = sub.total
        FROM (
          SELECT s."playerId", SUM(s.medals)::int AS total
          FROM "scoresaber-scores" s
          INNER JOIN "scoresaber-accounts" acc ON acc.id = s."playerId" AND acc.banned = false
          WHERE s.medals > 0
          GROUP BY s."playerId"
        ) AS sub
        WHERE a.id = sub."playerId"
          AND a.medals IS DISTINCT FROM sub.total
      `);
    });
  }

  /**
   * Recomputes the given players' account medal totals from their score rows.
   *
   * @param playerIds the players to sync
   * @returns the before/after totals of the players whose total actually changed
   */
  public static async syncMedalTotalsForPlayerIds(
    playerIds: string[]
  ): Promise<Map<string, { before: number; after: number }>> {
    const changes = new Map<string, { before: number; after: number }>();
    const unique = [...new Set(playerIds)];
    if (unique.length === 0) {
      return changes;
    }

    const totalsByPlayer = new Map<string, number>(unique.map(id => [id, 0]));

    const rows = await db
      .select({
        playerId: scoreSaberScoresTable.playerId,
        total: sql<number>`coalesce(sum(${scoreSaberScoresTable.medals}), 0)::int`,
      })
      .from(scoreSaberScoresTable)
      .innerJoin(scoreSaberAccountsTable, eq(scoreSaberScoresTable.playerId, scoreSaberAccountsTable.id))
      .where(
        and(
          inArray(scoreSaberScoresTable.playerId, unique),
          // Almost every score has 0 medals. Restricting to positive ones lets Postgres read just those
          // from the partial scores_player_medals_positive_idx instead of every score of each player,
          // and doesn't change the sums. Players with none keep the 0 they were seeded with above.
          gt(scoreSaberScoresTable.medals, 0),
          eq(scoreSaberAccountsTable.banned, false)
        )
      )
      .groupBy(scoreSaberScoresTable.playerId);

    for (const row of rows) {
      totalsByPlayer.set(row.playerId, Number(row.total));
    }

    const valueRows = unique.map(pid => sql`(${pid}::varchar(32), ${totalsByPlayer.get(pid) ?? 0}::int)`);
    // `o` is read from the statement's snapshot, so it holds the total from before this update
    const result = await db.execute(sql`
      UPDATE "scoresaber-accounts" AS a
      SET medals = v.medals
      FROM (VALUES ${sql.join(valueRows, sql`, `)}) AS v(id, medals)
      INNER JOIN "scoresaber-accounts" AS o ON o.id = v.id
      WHERE a.id = v.id
        AND a.medals IS DISTINCT FROM v.medals
      RETURNING a.id AS id, o.medals AS "beforeMedals", v.medals AS "afterMedals"
    `);
    const updated = (
      result as unknown as { rows?: { id: string; beforeMedals: number; afterMedals: number }[] }
    ).rows;
    for (const row of updated ?? []) {
      changes.set(row.id, { before: Number(row.beforeMedals ?? 0), after: Number(row.afterMedals) });
    }
    return changes;
  }

  public static async refreshMaterializedMedalRanks(): Promise<void> {
    await db.transaction(async tx => {
      await tx.execute(sql`
        WITH ranked AS (
          SELECT
            id,
            ROW_NUMBER() OVER (ORDER BY medals DESC, id ASC)::int AS global_rank,
            ROW_NUMBER() OVER (PARTITION BY country ORDER BY medals DESC, id ASC)::int AS country_rank
          FROM "scoresaber-accounts"
          WHERE medals > 0 AND country IS NOT NULL AND country <> '' AND banned = false
        )
        UPDATE "scoresaber-accounts" AS a
        SET
          "medalsRank" = r.global_rank,
          "medalsCountryRank" = r.country_rank
        FROM ranked AS r
        WHERE a.id = r.id
          AND (
            a."medalsRank" <> r.global_rank
            OR a."medalsCountryRank" <> r.country_rank
          )
      `);

      await tx.execute(sql`
        UPDATE "scoresaber-accounts"
        SET "medalsRank" = 0, "medalsCountryRank" = 0
        WHERE (
            "medalsRank" <> 0
            OR "medalsCountryRank" <> 0
          )
          AND NOT (
            medals > 0
            AND country IS NOT NULL
            AND country <> ''
            AND banned = false
          )
      `);
    });
  }

  private static medalRankingBaseWhere(country?: string) {
    return country
      ? and(
          gt(scoreSaberAccountsTable.medals, 0),
          isNotNull(scoreSaberAccountsTable.country),
          ne(scoreSaberAccountsTable.country, ""),
          eq(scoreSaberAccountsTable.banned, false),
          eq(scoreSaberAccountsTable.country, country)
        )
      : and(
          gt(scoreSaberAccountsTable.medals, 0),
          isNotNull(scoreSaberAccountsTable.country),
          ne(scoreSaberAccountsTable.country, ""),
          eq(scoreSaberAccountsTable.banned, false)
        );
  }

  public static async countMedalRankingPlayers(country?: string): Promise<number> {
    const baseWhere = ScoreSaberMedalsRepository.medalRankingBaseWhere(country);
    const [row] = await db.select({ totalPlayers: count() }).from(scoreSaberAccountsTable).where(baseWhere);
    return row?.totalPlayers ?? 0;
  }

  public static async selectMedalRankingCountryMetadata(
    country?: string
  ): Promise<{ country: string | null; count: number }[]> {
    const baseWhere = ScoreSaberMedalsRepository.medalRankingBaseWhere(country);
    return db
      .select({ country: scoreSaberAccountsTable.country, count: count() })
      .from(scoreSaberAccountsTable)
      .where(
        and(baseWhere, isNotNull(scoreSaberAccountsTable.country), ne(scoreSaberAccountsTable.country, ""))
      )
      .groupBy(scoreSaberAccountsTable.country)
      .orderBy(desc(count()));
  }

  public static async selectMedalRankingPage(country: string | undefined, offset: number, limit: number) {
    const baseWhere = ScoreSaberMedalsRepository.medalRankingBaseWhere(country);
    return db
      .select()
      .from(scoreSaberAccountsTable)
      .where(baseWhere)
      .orderBy(descNullsLast(scoreSaberAccountsTable.medals), asc(scoreSaberAccountsTable.id))
      .limit(limit)
      .offset(offset);
  }
}
