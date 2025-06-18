import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { DetailType } from "@ssr/common/detail-type";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { MiniRankingType } from "@ssr/common/types/around-player";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { fetchWithCache } from "../../common/cache.util";
import CacheService, { ServiceCache } from "../cache.service";
import ScoreSaberService from "./scoresaber.service";

export default class MiniRankingService {
  /**
   * Gets the players around a player.
   *
   * @param id the player to get around
   * @param type the type to get around
   */
  public static async getPlayerMiniRanking(
    id: string,
    type: MiniRankingType
  ): Promise<ScoreSaberPlayer[]> {
    const getRank = (player: ScoreSaberPlayer | ScoreSaberPlayerToken, type: MiniRankingType) => {
      switch (type) {
        case "global":
          return player.rank;
        case "country":
          return player.countryRank;
      }
    };

    // Get player directly since getPlayer already uses caching
    const player = await ScoreSaberService.getPlayer(id, DetailType.BASIC);
    if (player == undefined) {
      throw new NotFoundError(`Player "${id}" not found`);
    }

    const rank = getRank(player, type);
    if (rank <= 0) {
      return []; // Return empty array for invalid ranks
    }

    // Calculate the range of ranks we need to fetch
    const startRank = Math.max(1, rank - 2);
    const endRank = rank + 2;

    // Calculate the pages we need to fetch
    const itemsPerPage = 50;
    const startPage = Math.ceil(startRank / itemsPerPage);
    const endPage = Math.ceil(endRank / itemsPerPage);

    // If we're near the top ranks, we need to fetch more pages below to ensure we have 5 players
    const extraPagesNeeded = rank <= 3 ? Math.ceil(5 / itemsPerPage) : 0;
    const finalEndPage = endPage + extraPagesNeeded;

    // Fetch all required pages in parallel with caching
    const pageResponses = await Promise.all(
      Array.from({ length: finalEndPage - startPage + 1 }, (_, i) => startPage + i).map(page =>
        fetchWithCache(
          CacheService.getCache(ServiceCache.ScoreSaber),
          `players:${type}:${page}`,
          async () =>
            type === "global"
              ? ApiServiceRegistry.getInstance().getScoreSaberService().lookupPlayers(page)
              : ApiServiceRegistry.getInstance()
                  .getScoreSaberService()
                  .lookupPlayersByCountry(page, player.country)
        )
      )
    );

    // Combine and sort all players
    const allPlayers = pageResponses
      .filter((response): response is NonNullable<typeof response> => response !== undefined)
      .flatMap(response => response.players)
      .sort((a, b) => getRank(a, type) - getRank(b, type));

    // Find the target player
    const playerIndex = allPlayers.findIndex(p => p.id === id);
    if (playerIndex === -1) {
      return [];
    }

    // Get exactly 5 players: 2 above, the player, and 2 below
    const start = Math.max(0, playerIndex - 2);
    const end = Math.min(allPlayers.length, playerIndex + 3);
    const result = allPlayers.slice(start, end);

    // If we don't have enough players (e.g., for rank 1-3), get more from below
    if (result.length < 5 && end < allPlayers.length) {
      const extraNeeded = 5 - result.length;
      const extraPlayers = allPlayers.slice(end, end + extraNeeded);
      result.push(...extraPlayers);
    }

    return await Promise.all(
      result.map(player => ScoreSaberService.getPlayer(player.id, DetailType.BASIC, player))
    );
  }
}
