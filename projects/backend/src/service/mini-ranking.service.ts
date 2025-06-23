import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { DetailType } from "@ssr/common/detail-type";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { MiniRankingResponse } from "@ssr/common/response/around-player-response";
import { MiniRankingType } from "@ssr/common/types/around-player";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import CacheService, { CacheId } from "./cache.service";
import ScoreSaberService from "./scoresaber/scoresaber.service";

export default class MiniRankingService {
  /**
   * Gets the players around a player for both global and country rankings.
   *
   * @param id the player to get around
   */
  public static async getPlayerMiniRankings(id: string): Promise<MiniRankingResponse> {
    const player = await ScoreSaberService.getPlayer(id, DetailType.BASIC);
    if (player == undefined) {
      throw new NotFoundError(`Player "${id}" not found`);
    }

    const [globalRankings, countryRankings] = await Promise.all([
      this.getPlayerMiniRanking(player, "global"),
      this.getPlayerMiniRanking(player, "country"),
    ]);

    return {
      globalRankings,
      countryRankings,
    };
  }

  /**
   * Gets the mini rankings for a player.
   *
   * @param player the player to get around
   * @param type the type to get around
   */
  private static async getPlayerMiniRanking(
    player: ScoreSaberPlayer,
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
        CacheService.fetchWithCache(
          CacheId.ScoreSaber,
          `scoresaber:mini-ranking:${type}:${page}${type === "country" ? `:${player.country}` : ""}`,
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
    const playerIndex = allPlayers.findIndex(p => p.id === player.id);
    if (playerIndex === -1) {
      return [];
    }

    // Get exactly 5 players: 3 above, the player, and 1 below
    const result = [];

    // Add 3 players above (if available)
    for (let i = Math.max(0, playerIndex - 3); i < playerIndex; i++) {
      result.push(allPlayers[i]);
    }

    // Add the requested player
    result.push(allPlayers[playerIndex]);

    // Add players below to fill up to 5 total players
    const playersBelowNeeded = Math.max(1, 5 - result.length); // At least 1, but more if needed to reach 5

    for (
      let i = playerIndex + 1;
      i < Math.min(allPlayers.length, playerIndex + 1 + playersBelowNeeded);
      i++
    ) {
      result.push(allPlayers[i]);
    }

    return await Promise.all(
      result.map(player => ScoreSaberService.getPlayer(player.id, DetailType.BASIC, player))
    );
  }
}
