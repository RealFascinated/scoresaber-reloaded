import { MEDAL_COUNTS, MEDAL_RANKS } from "@ssr/common/medal";
import { and, asc, count, desc, eq, gt, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { db } from "../db";
import { scoreSaberAccountsTable, scoreSaberLeaderboardsTable, scoreSaberScoresTable } from "../db/schema";

const MEDALS_BULK_UPDATE_CHUNK = 2000;

function sqlMedalPointsCase(rnColumnIdentifier: string) {
  const whens = MEDAL_RANKS.map(rank =>
    sql`WHEN ${rank}::int THEN ${MEDAL_COUNTS[rank]}::int`
  );
  return sql`CASE ${sql.raw(rnColumnIdentifier)} ${sql.join(whens, sql` `)} ELSE 0 END`;
}

function distinctPlayerIds(result: unknown): string[] {
  const rows = (result as { rows?: { playerId: string }[] }).rows ?? [];
  return [...new Set(rows.map(r => r.playerId))];
}

export class ScoreSaberMedalsRepository {
  public static async updateMedalsOnRankedLeaderboard(leaderboardId: number): Promise<void> {
    await db.execute(ScoreSaberMedalsRepository.rankedLeaderboardMedalsUpdateSql(leaderboardId, false));
  }

  private static rankedLeaderboardMedalsUpdateSql(leaderboardId: number, returnPlayerIds: boolean) {
    return sql`
        WITH top10_rows AS MATERIALIZED (
          SELECT s."scoreId", s.score
          FROM "scoresaber-scores" s
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
        ${returnPlayerIds ? sql`RETURNING u."playerId" AS "playerId"` : sql``}
      `;
  }

  public static async updateMedalsOnLeaderboard(leaderboardId: number): Promise<string[]> {
    return db.transaction(async tx => {
      const [lb] = await tx
        .select({ ranked: scoreSaberLeaderboardsTable.ranked })
        .from(scoreSaberLeaderboardsTable)
        .where(eq(scoreSaberLeaderboardsTable.id, leaderboardId))
        .limit(1);

      const isRanked = lb?.ranked === true;

      if (!isRanked) {
        const cleared = await tx.execute(sql`
          UPDATE "scoresaber-scores" AS s
          SET medals = 0
          WHERE s."leaderboardId" = ${leaderboardId}
            AND s.medals <> 0
          RETURNING s."playerId" AS "playerId"
        `);
        return distinctPlayerIds(cleared);
      }

      const updated = await tx.execute(
        ScoreSaberMedalsRepository.rankedLeaderboardMedalsUpdateSql(leaderboardId, true)
      );
      return distinctPlayerIds(updated);
    });
  }

  public static async recomputeAllMedalsGlobalWindow(): Promise<void> {
    await db.transaction(async tx => {
      await tx.execute(sql`
        UPDATE "scoresaber-scores" AS s
        SET medals = 0
        FROM "scoresaber-leaderboards" AS l
        WHERE s."leaderboardId" = l.id
          AND l.ranked = false
          AND s.medals <> 0
      `);
      await tx.execute(sql`
        WITH ranked AS (
          SELECT
            s."scoreId",
            ROW_NUMBER() OVER (
              PARTITION BY s."leaderboardId"
              ORDER BY s.score DESC NULLS LAST, s."scoreId" DESC NULLS LAST
            )::int AS rn
          FROM "scoresaber-scores" s
          INNER JOIN "scoresaber-leaderboards" l ON l.id = s."leaderboardId" AND l.ranked = true
        ),
        computed AS (
          SELECT
            ranked."scoreId",
            ${sqlMedalPointsCase("ranked.rn")} AS medal
          FROM ranked
        )
        UPDATE "scoresaber-scores" AS t
        SET medals = c.medal
        FROM computed AS c
        WHERE t."scoreId" = c."scoreId"
          AND t.medals IS DISTINCT FROM c.medal
      `);
    });
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
          "scoreId",
          cast(
            row_number() over (
              partition by "leaderboardId"
              order by
                medals desc,
                timestamp desc,
                "scoreId" desc
            ) as integer
          ) AS rank
        FROM "scoresaber-scores"
        WHERE "leaderboardId" IN (${sql.join(
      leaderboardIds.map(id => sql`${id}`),
      sql`, `
    )})
          AND medals > 0
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
    if (ids.length === 0) return [];
    return db
      .select({ id: scoreSaberAccountsTable.id, medals: scoreSaberAccountsTable.medals })
      .from(scoreSaberAccountsTable)
      .where(inArray(scoreSaberAccountsTable.id, ids));
  }

  public static async syncGlobalMedalTotalsFromScoresTable(): Promise<void> {
    await db.transaction(async tx => {
      await tx
        .update(scoreSaberAccountsTable)
        .set({ medals: 0 })
        .where(gt(scoreSaberAccountsTable.medals, 0));

      await tx.execute(sql`
        UPDATE "scoresaber-accounts" AS a
        SET medals = sub.total
        FROM (
          SELECT "playerId", SUM(medals)::int AS total
          FROM "scoresaber-scores"
          WHERE medals > 0
          GROUP BY "playerId"
        ) AS sub
        WHERE a.id = sub."playerId"
      `);
    });
  }

  public static async getMedalsForPlayerId(playerId: string): Promise<number> {
    const [row] = await db
      .select({ medals: scoreSaberAccountsTable.medals })
      .from(scoreSaberAccountsTable)
      .where(eq(scoreSaberAccountsTable.id, playerId));
    return row?.medals ?? 0;
  }

  public static async setMedalsForPlayerIds(
    totalsByPlayer: Map<string, number>,
    playerIds: string[]
  ): Promise<void> {
    if (playerIds.length === 0) {
      return;
    }

    await db.transaction(async tx => {
      for (let i = 0; i < playerIds.length; i += MEDALS_BULK_UPDATE_CHUNK) {
        const chunk = playerIds.slice(i, i + MEDALS_BULK_UPDATE_CHUNK);
        const valueRows = chunk.map(pid => sql`(${pid}::varchar(32), ${totalsByPlayer.get(pid) ?? 0}::int)`);
        await tx.execute(sql`
          UPDATE "scoresaber-accounts" AS a
          SET medals = v.medals
          FROM (VALUES ${sql.join(valueRows, sql`, `)}) AS v(id, medals)
          WHERE a.id = v.id
        `);
      }
    });
  }

  public static async syncMedalTotalsForPlayerIds(playerIds: string[]): Promise<void> {
    const unique = [...new Set(playerIds)];
    if (unique.length === 0) {
      return;
    }

    const totalsByPlayer = new Map<string, number>(unique.map(id => [id, 0]));

    for (let i = 0; i < unique.length; i += MEDALS_BULK_UPDATE_CHUNK) {
      const chunk = unique.slice(i, i + MEDALS_BULK_UPDATE_CHUNK);
      const rows = await db
        .select({
          playerId: scoreSaberScoresTable.playerId,
          total: sql<number>`coalesce(sum(${scoreSaberScoresTable.medals}), 0)::int`,
        })
        .from(scoreSaberScoresTable)
        .where(inArray(scoreSaberScoresTable.playerId, chunk))
        .groupBy(scoreSaberScoresTable.playerId);

      for (const row of rows) {
        totalsByPlayer.set(row.playerId, Number(row.total));
      }
    }

    await ScoreSaberMedalsRepository.setMedalsForPlayerIds(totalsByPlayer, unique);
  }

  public static async refreshMaterializedMedalRanks(): Promise<void> {
    await db.transaction(async tx => {
      await tx.execute(sql`
        UPDATE "scoresaber-accounts"
        SET "medalsRank" = 0, "medalsCountryRank" = 0
        WHERE "medalsRank" != 0 OR "medalsCountryRank" != 0
      `);
      await tx.execute(sql`
        UPDATE "scoresaber-accounts" AS a
        SET
          "medalsRank" = r.global_rank,
          "medalsCountryRank" = r.country_rank
        FROM (
          SELECT
            id,
            ROW_NUMBER() OVER (ORDER BY medals DESC, id ASC)::int AS global_rank,
            ROW_NUMBER() OVER (PARTITION BY country ORDER BY medals DESC, id ASC)::int AS country_rank
          FROM "scoresaber-accounts"
          WHERE medals > 0 AND country IS NOT NULL AND country != ''
        ) AS r
        WHERE a.id = r.id
      `);
    });
  }

  public static async selectMedalRanksByIds(
    ids: string[]
  ): Promise<{ id: string; medalsRank: number; medalsCountryRank: number }[]> {
    if (ids.length === 0) return [];
    return db
      .select({
        id: scoreSaberAccountsTable.id,
        medalsRank: scoreSaberAccountsTable.medalsRank,
        medalsCountryRank: scoreSaberAccountsTable.medalsCountryRank,
      })
      .from(scoreSaberAccountsTable)
      .where(inArray(scoreSaberAccountsTable.id, ids));
  }

  private static medalRankingBaseWhere(country?: string) {
    return sql`
      medals > 0
      AND country IS NOT NULL
      AND country != ''
      ${country ? sql`AND country = ${country}` : sql``}
    `;
  }

  public static async countMedalRankingEligible(country?: string): Promise<number> {
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

  public static async selectMedalRankingPage(
    country: string | undefined,
    offset: number,
    limit: number
  ): Promise<{ id: string; medals: number; country: string | null }[]> {
    const baseWhere = ScoreSaberMedalsRepository.medalRankingBaseWhere(country);
    return db
      .select({
        id: scoreSaberAccountsTable.id,
        medals: scoreSaberAccountsTable.medals,
        country: scoreSaberAccountsTable.country,
      })
      .from(scoreSaberAccountsTable)
      .where(baseWhere)
      .orderBy(desc(scoreSaberAccountsTable.medals), asc(scoreSaberAccountsTable.id))
      .limit(limit)
      .offset(offset);
  }
}