import Logger from "@ssr/common/logger";
import { Pagination } from "@ssr/common/pagination";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerMedalRankingsResponse } from "@ssr/common/schemas/response/ranking/medal-rankings";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { and, asc, count, desc, eq, gt, inArray, isNotNull, ne, sql, sum } from "drizzle-orm";
import { db } from "../../db";
import { scoreSaberAccountsTable, scoreSaberMedalScoresTable } from "../../db/schema";
import ScoreSaberService from "../scoresaber.service";

function buildMedalRankingWhere(country?: string) {
  return and(
    gt(scoreSaberAccountsTable.medals, 0),
    isNotNull(scoreSaberAccountsTable.country),
    ne(scoreSaberAccountsTable.country, ""),
    country ? eq(scoreSaberAccountsTable.country, country) : undefined
  );
}

/**
 * Gets medal ranks for a list of player IDs.
 *
 * @param playerIds the player ids to get ranks for
 * @param options.country optional country filter
 * @param options.partitionByCountry whether to partition ranks by country
 * @returns a map of player id to rank
 */
async function getMedalRanksForIds(
  playerIds: string[],
  options: { country?: string; partitionByCountry?: boolean }
): Promise<Map<string, number>> {
  if (playerIds.length === 0) return new Map();

  const { country, partitionByCountry } = options;
  const partitionClause = partitionByCountry ? sql`PARTITION BY country` : sql``;
  const countryFilter = country ? sql`AND country = ${country}` : sql``;

  const result = await db.execute(sql`
    WITH ranked AS (
      SELECT id, ROW_NUMBER() OVER (${partitionClause} ORDER BY medals DESC, id ASC) AS rank
      FROM "scoresaber-accounts"
      WHERE medals > 0
        AND country IS NOT NULL
        AND country != ''
        ${countryFilter}
    )
    SELECT id, rank::int AS rank FROM ranked
    WHERE id IN (${sql.join(
      playerIds.map(id => sql`${id}`),
      sql`, `
    )})
  `);

  const rows = (result as unknown as { rows: { id: string; rank: number }[] }).rows ?? [];
  return new Map(rows.map(r => [r.id, Number(r.rank)]));
}

export class PlayerMedalsService {
  /**
   * Updates the global medal count for all players.
   */
  public static async updatePlayerGlobalMedalCounts(): Promise<void> {
    const before = performance.now();

    const medalCountRows = await db
      .select({
        playerId: scoreSaberMedalScoresTable.playerId,
        totalMedals: sum(scoreSaberMedalScoresTable.medals),
      })
      .from(scoreSaberMedalScoresTable)
      .groupBy(scoreSaberMedalScoresTable.playerId);

    const playerMedalCounts = new Map(
      medalCountRows.map(row => [row.playerId, Number(row.totalMedals ?? 0)])
    );

    // Reset players who no longer have medals, upsert the rest
    await db.transaction(async tx => {
      await tx
        .update(scoreSaberAccountsTable)
        .set({ medals: 0 })
        .where(
          and(
            gt(scoreSaberAccountsTable.medals, 0),
            playerMedalCounts.size > 0
              ? inArray(scoreSaberAccountsTable.id, [...playerMedalCounts.keys()])
              : undefined
          )
        );

      for (const [playerId, medalCount] of playerMedalCounts) {
        await tx
          .update(scoreSaberAccountsTable)
          .set({ medals: medalCount })
          .where(eq(scoreSaberAccountsTable.id, playerId));
      }
    });

    Logger.info(
      `[PLAYER MEDALS] Updated ${playerMedalCounts.size} player medal counts in ${formatDuration(performance.now() - before)}`
    );
  }

  /**
   * Updates the medal count for a list of players.
   *
   * @param playerIds the ids of the players
   * @returns a map of player id to medal count
   */
  public static async updatePlayerMedalCounts(...playerIds: string[]): Promise<Record<string, number>> {
    const before = performance.now();

    if (playerIds.length === 0) return {};

    const medalCounts = await db
      .select({
        playerId: scoreSaberMedalScoresTable.playerId,
        totalMedals: sum(scoreSaberMedalScoresTable.medals),
      })
      .from(scoreSaberMedalScoresTable)
      .where(inArray(scoreSaberMedalScoresTable.playerId, playerIds))
      .groupBy(scoreSaberMedalScoresTable.playerId);

    const normalized = medalCounts.map(row => ({
      playerId: row.playerId,
      totalMedals: Number(row.totalMedals ?? 0),
    }));

    await db.transaction(async tx => {
      for (const { playerId, totalMedals } of normalized) {
        await tx
          .update(scoreSaberAccountsTable)
          .set({ medals: totalMedals })
          .where(eq(scoreSaberAccountsTable.id, playerId));
      }
    });

    Logger.info(
      `[PLAYER MEDALS] Updated ${normalized.length} player medal counts in ${formatDuration(performance.now() - before)}`
    );

    return Object.fromEntries(normalized.map(({ playerId, totalMedals }) => [playerId, totalMedals]));
  }

  /**
   * Gets the amount of medals a player has.
   *
   * @param playerId the id of the player
   * @returns the medal count
   */
  public static async getPlayerMedals(playerId: string): Promise<number> {
    const [row] = await db
      .select({ medals: scoreSaberAccountsTable.medals })
      .from(scoreSaberAccountsTable)
      .where(eq(scoreSaberAccountsTable.id, playerId))
      .limit(1);
    return row?.medals ?? 0;
  }

  /**
   * Gets the player medal ranking for a page.
   *
   * @param page the page number
   * @param country optional country filter
   * @returns the players
   */
  public static async getPlayerMedalRanking(
    page: number,
    country?: string
  ): Promise<PlayerMedalRankingsResponse> {
    const baseWhere = buildMedalRankingWhere(country);
    const itemsPerPage = 50;

    const [{ totalPlayers }, countryMetadataRows] = await Promise.all([
      db
        .select({ totalPlayers: count() })
        .from(scoreSaberAccountsTable)
        .where(baseWhere)
        .then(([r]) => ({ totalPlayers: r?.totalPlayers ?? 0 })),
      db
        .select({ country: scoreSaberAccountsTable.country, count: count() })
        .from(scoreSaberAccountsTable)
        .where(
          and(baseWhere, isNotNull(scoreSaberAccountsTable.country), ne(scoreSaberAccountsTable.country, ""))
        )
        .groupBy(scoreSaberAccountsTable.country)
        .orderBy(desc(count())),
    ]);

    if (totalPlayers === 0) {
      return { ...Pagination.empty<ScoreSaberPlayer>(), countryMetadata: {} } as PlayerMedalRankingsResponse;
    }

    const pagination = new Pagination<ScoreSaberPlayer>()
      .setItemsPerPage(itemsPerPage)
      .setTotalItems(totalPlayers);

    const pageData = await pagination.getPage(page, async fetchRange => {
      const players = await db
        .select({
          id: scoreSaberAccountsTable.id,
          medals: scoreSaberAccountsTable.medals,
          country: scoreSaberAccountsTable.country,
        })
        .from(scoreSaberAccountsTable)
        .where(baseWhere)
        .orderBy(desc(scoreSaberAccountsTable.medals), asc(scoreSaberAccountsTable.id))
        .limit(fetchRange.end - fetchRange.start)
        .offset(fetchRange.start);

      if (!players.length) return [];

      const playerIds = players.map(p => p.id);
      const [globalRankMap, countryRankMap] = await Promise.all([
        getMedalRanksForIds(playerIds, { country }),
        getMedalRanksForIds(playerIds, { partitionByCountry: true }),
      ]);

      return Promise.all(
        players.map(async ({ id }) => {
          const playerData = await ScoreSaberService.getPlayer(
            id,
            "basic",
            await ScoreSaberService.getCachedPlayer(id)
          );
          playerData.medalsRank = globalRankMap.get(id) ?? 0;
          playerData.countryMedalsRank = countryRankMap.get(id) ?? 0;
          return playerData;
        })
      );
    });

    return {
      ...pageData,
      countryMetadata: Object.fromEntries(
        countryMetadataRows.filter(r => r.country).map(r => [r.country!, r.count])
      ),
    } as PlayerMedalRankingsResponse;
  }

  /**
   * Gets a player's global medal rank.
   *
   * @param playerId the id of the player
   * @returns the rank, or null if the player has no medals
   */
  public static async getPlayerMedalRank(playerId: string): Promise<number | null> {
    const result = await db.execute<{ rank: number }>(sql`
      SELECT rank::int FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY medals DESC, id ASC) AS rank
        FROM "scoresaber-accounts"
        WHERE medals > 0 AND country IS NOT NULL AND country != ''
      ) ranked
      WHERE id = ${playerId}
    `);
    return result.rows[0]?.rank ?? null;
  }

  /**
   * Gets a player's country medal rank.
   *
   * @param playerId the id of the player
   * @returns the rank, or null if the player has no medals
   */
  public static async getPlayerCountryMedalRank(playerId: string): Promise<number | null> {
    const result = await db.execute<{ rank: number }>(sql`
      SELECT rank::int FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY country ORDER BY medals DESC, id ASC) AS rank
        FROM "scoresaber-accounts"
        WHERE medals > 0 AND country IS NOT NULL AND country != ''
      ) ranked
      WHERE id = ${playerId}
    `);
    return result.rows[0]?.rank ?? null;
  }
}
