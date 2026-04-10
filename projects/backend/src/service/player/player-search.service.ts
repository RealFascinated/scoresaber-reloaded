import { Pagination } from "@ssr/common/pagination";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerRankingsResponse } from "@ssr/common/schemas/response/player/player-rankings";
import { playerRankingCountryCountsCacheKey } from "../../common/cache-keys";
import { ScoreSaberAccountsRepository } from "../../repositories/scoresaber-accounts.repository";
import { ScoreSaberApiService } from "../external/scoresaber-api.service";
import CacheService, { CacheId } from "../infra/cache.service";
import ScoreSaberPlayerService from "./scoresaber-player.service";

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
      normalizedQuery.length > 0 ? ScoreSaberAccountsRepository.searchIdsByNameIlike(pattern, 20) : [],
    ]);

    const scoreSaberPlayerTokens = scoreSaberResponse?.players;
    const scoreSaberPlayerTokenMap = new Map((scoreSaberPlayerTokens ?? []).map(token => [token.id, token]));
    const uniquePlayerIds = [
      ...new Set(localMatches.map(p => p.id).concat(scoreSaberPlayerTokens?.map(token => token.id) ?? [])),
    ];
    const cachedTokens = await ScoreSaberPlayerService.getCachedPlayers(
      uniquePlayerIds.filter(id => !scoreSaberPlayerTokenMap.has(id))
    );

    // Get players from ScoreSaber
    return (
      await Promise.all(
        uniquePlayerIds.map(async id =>
          ScoreSaberPlayerService.getPlayer(
            id,
            "basic",
            scoreSaberPlayerTokenMap.get(id) || cachedTokens.get(id)
          )
        )
      )
    ).sort((a, b) => {
      if (a.inactive && !b.inactive) {
        return 1;
      } // Inactive players should be at the bottom
      if (!a.inactive && b.inactive) {
        return -1;
      } // Active players should be at the top
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
        ...Pagination.empty<ScoreSaberPlayer>(),
        countryMetadata: {},
      };
    }

    /**
     * Gets the amount of players in each country.
     *
     * @returns the amount of players in each country
     */
    async function getPlayerCountryCounts() {
      return CacheService.fetch<Record<string, number>>(
        CacheId.SCORESABER_PLAYER_RANKING_COUNTRY_COUNTS,
        playerRankingCountryCountsCacheKey(),
        async () => {
          const rows = await ScoreSaberAccountsRepository.selectCountryCountsActivePlayers();
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
      );
    }

    const [foundPlayers, countryCounts] = await Promise.all([
      country
        ? ScoreSaberApiService.lookupPlayersByCountry(page, country, search)
        : ScoreSaberApiService.lookupPlayers(page, search),
      getPlayerCountryCounts(),
    ]);

    const tokens = foundPlayers?.players ?? [];
    const items = await Promise.all(
      tokens.map(token => ScoreSaberPlayerService.getPlayer(token.id, "basic", token))
    );

    return {
      items,
      metadata: {
        totalPages: Math.ceil(
          (foundPlayers?.metadata.total ?? 0) / (foundPlayers?.metadata.itemsPerPage ?? 0)
        ),
        totalItems: foundPlayers?.metadata.total ?? 0,
        page,
        itemsPerPage: foundPlayers?.metadata.itemsPerPage ?? 0,
      },
      countryMetadata: countryCounts,
    };
  }
}
