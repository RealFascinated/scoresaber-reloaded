import { Pagination } from "@ssr/common/pagination";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import { PlayerRankingsResponse } from "@ssr/common/schemas/response/player/player-rankings";
import { ScoreSaberAccountsRepository } from "../../repositories/scoresaber-accounts.repository";
import { ScoreSaberApiService } from "../external/scoresaber-api.service";
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

    const scoreSaberPlayerTokens = scoreSaberResponse?.data;
    const scoreSaberPlayerTokenMap = new Map((scoreSaberPlayerTokens ?? []).map(token => [token.id, token]));
    const uniquePlayerIds = [
      ...new Set(localMatches.map(p => p.id).concat(scoreSaberPlayerTokens?.map(token => token.id) ?? [])),
    ];
    // Get players from ScoreSaber
    return (
      await Promise.all(
        uniquePlayerIds.map(async id =>
          ScoreSaberPlayerService.getPlayer(id, "basic", scoreSaberPlayerTokenMap.get(id), DEFAULT_REALM_ID)
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
      includeInactives?: boolean;
      realmId?: number;
    }
  ): Promise<PlayerRankingsResponse> {
    const { country, search, includeInactives, realmId = DEFAULT_REALM_ID } = options ?? {};
    if (search && search.length < 3) {
      return Pagination.empty<ScoreSaberPlayer>();
    }

    const foundPlayers = await ScoreSaberApiService.lookupPlayers(page, {
      country,
      search,
      includeInactives,
      realmId,
    });

    if (!foundPlayers) {
      return Pagination.empty<ScoreSaberPlayer>();
    }

    const tokens = foundPlayers.data;
    const players = await ScoreSaberPlayerService.getPlayersFromTokens(tokens, realmId);
    const items = players.map((player, index) => ({
      ...player,
      contextualRank: tokens[index].stats.rank,
      contextualCountryRank: tokens[index].stats.countryRank,
    }));

    return {
      items,
      metadata: {
        totalPages:
          foundPlayers.metadata.itemsPerPage > 0
            ? Math.ceil(foundPlayers.metadata.totalItems / foundPlayers.metadata.itemsPerPage)
            : 0,
        totalItems: foundPlayers.metadata.totalItems,
        page,
        itemsPerPage: foundPlayers.metadata.itemsPerPage,
      },
    };
  }
}
