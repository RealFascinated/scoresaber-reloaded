import { Pagination } from "@ssr/common/pagination";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerRankingsResponse } from "@ssr/common/schemas/response/player/player-rankings";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { and, asc, count, desc, eq, ilike, isNotNull, ne } from "drizzle-orm";
import { db } from "../../db";
import { scoreSaberAccountsTable } from "../../db/schema";
import { ScoreSaberApiService } from "../scoresaber-api.service";
import ScoreSaberService from "../scoresaber.service";

export class PlayerSearchService {
  /**
   * Searches for players by name.
   *
   * @param query the query to search for
   * @returns the players that match the query
   */
  public static async searchPlayers(query?: string): Promise<ScoreSaberPlayer[]> {
    const normalizedQuery = (query ?? "").trim();

    // Preserve existing behavior for empty query (`""`): call ScoreSaber and return its results.
    // Treat short non-empty queries as invalid: trim length 1..3 returns no results without calling external APIs.
    if (normalizedQuery.length > 0 && normalizedQuery.length <= 3) {
      return [];
    }

    const pattern = normalizedQuery.length > 0 ? `%${normalizedQuery.replace(/[%_\\]/g, "\\$&")}%` : "";

    const [scoreSaberResponse, localMatches] = await Promise.all([
      ScoreSaberApiService.searchPlayers(normalizedQuery.length === 0 ? "" : normalizedQuery),
      normalizedQuery.length > 0
        ? db
            .select({ id: scoreSaberAccountsTable.id })
            .from(scoreSaberAccountsTable)
            .where(ilike(scoreSaberAccountsTable.name, pattern))
            .orderBy(asc(scoreSaberAccountsTable.name))
            .limit(20)
        : [],
    ]);

    const scoreSaberPlayerTokens = scoreSaberResponse?.players;
    const uniquePlayerIds = [
      ...new Set(localMatches.map(p => p.id).concat(scoreSaberPlayerTokens?.map(token => token.id) ?? [])),
    ];

    // Get players from ScoreSaber
    return (
      await Promise.all(
        uniquePlayerIds.map(async id =>
          ScoreSaberService.getPlayer(
            id,
            "basic",
            scoreSaberPlayerTokens?.find(token => token.id === id) ||
              (await ScoreSaberService.getCachedPlayer(id)) // Use the cache for inactive players
          )
        )
      )
    ).sort((a, b) => {
      if (a.inactive && !b.inactive) return 1; // Inactive players should be at the bottom
      if (!a.inactive && b.inactive) return -1; // Active players should be at the top
      return a.rank - b.rank; // Sort by rank ascending
    });
  }

  /**
   * Gets a player ranking.
   *
   * @param page the page to get
   * @param options the options to get the player ranking
   * @returns the player ranking
   */
  public static async getPlayerRanking(
    page: number,
    options?: {
      country?: string;
      search?: string;
    }
  ): Promise<PlayerRankingsResponse> {
    const { country, search } = options ?? {};
    if (search && search.length < 3) {
      return {
        ...Pagination.empty<ScoreSaberPlayerToken>(),
        countryMetadata: {},
      } as PlayerRankingsResponse;
    }

    /**
     * Gets the amount of players in each country.
     *
     * @returns the amount of players in each country
     */
    async function getPlayerCountryCounts() {
      const rows = await db
        .select({
          country: scoreSaberAccountsTable.country,
          c: count(),
        })
        .from(scoreSaberAccountsTable)
        .where(
          and(
            eq(scoreSaberAccountsTable.inactive, false),
            isNotNull(scoreSaberAccountsTable.country),
            ne(scoreSaberAccountsTable.country, "")
          )
        )
        .groupBy(scoreSaberAccountsTable.country)
        .orderBy(desc(count()));

      return rows.reduce(
        (acc, curr) => {
          if (curr.country) {
            acc[curr.country] = curr.c;
          }
          return acc;
        },
        {} as Record<string, number>
      );
    }

    const [foundPlayers, countryCounts] = await Promise.all([
      country
        ? ScoreSaberApiService.lookupPlayersByCountry(page, country, search)
        : ScoreSaberApiService.lookupPlayers(page, search),
      getPlayerCountryCounts(),
    ]);

    return {
      items: foundPlayers?.players ?? [],
      metadata: {
        totalPages: Math.ceil(
          (foundPlayers?.metadata.total ?? 0) / (foundPlayers?.metadata.itemsPerPage ?? 0)
        ),
        totalItems: foundPlayers?.metadata.total ?? 0,
        page,
        itemsPerPage: foundPlayers?.metadata.itemsPerPage ?? 0,
      },
      countryMetadata: countryCounts,
    } as PlayerRankingsResponse;
  }
}
