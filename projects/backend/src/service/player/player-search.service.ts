import { Pagination } from "@ssr/common/pagination";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
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
  public static async searchPlayers(query?: string) {
    const normalizedQuery = (query ?? "").trim();

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
    return (
      await Promise.all(
        uniquePlayerIds.map(async id =>
          ScoreSaberPlayerService.getPlayer(id, "basic", scoreSaberPlayerTokenMap.get(id), DEFAULT_REALM_ID)
        )
      )
    ).sort((a, b) => {
      if (a.inactive && !b.inactive) {
        return 1;
      }
      if (!a.inactive && b.inactive) {
        return -1;
      }
      return a.rank - b.rank;
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
  ) {
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
