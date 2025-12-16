import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { MiniRankingResponse } from "@ssr/common/schemas/response/player/around-player";
import CacheService, { CacheId } from "./cache.service";
import { PlayerMedalsService } from "./player/player-medals.service";
import ScoreSaberService from "./scoresaber.service";

type MiniRankingType = "global" | "country" | "medals";

export default class MiniRankingService {
  /**
   * Gets the players around a player for both global and country rankings.
   *
   * @param id the player to get around
   */
  public static async getPlayerMiniRankings(id: string): Promise<MiniRankingResponse> {
    const player = await ScoreSaberService.getPlayer(id, "basic");
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
    const getRank = (player: ScoreSaberPlayer, type: MiniRankingType): number | undefined => {
      switch (type) {
        case "global":
          return player.rank;
        case "country":
          return player.countryRank;
      }
    };

    const rank = getRank(player, type);
    if (rank == undefined || rank <= 0) {
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

    // Handle medal rankings differently - use PlayerService instead of ScoreSaber API
    if (type === "medals") {
      const pageResponses = await Promise.all(
        Array.from({ length: finalEndPage - startPage + 1 }, (_, i) => startPage + i).map(page =>
          CacheService.fetchWithCache(
            CacheId.ScoreSaber,
            `scoresaber:mini-ranking:medals:${page}`,
            async () => PlayerMedalsService.getPlayerMedalRanking(page)
          )
        )
      );

      // Combine all players - getPlayerMedalRanking already returns ScoreSaberPlayer objects
      const allPlayers = pageResponses
        .filter((response): response is NonNullable<typeof response> => response !== undefined)
        .flatMap(response => response.items);

      return this.processPlayersAndBuildResult(
        allPlayers.map(playerData => Promise.resolve(playerData)),
        player,
        type,
        getRank
      );
    }

    // Fetch all required pages in parallel with caching for global and country rankings
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
      .map(async player => await ScoreSaberService.getPlayer(player.id, "basic", player));

    return this.processPlayersAndBuildResult(allPlayers, player, type, getRank);
  }

  /**
   * Processes the players and builds the result array with the target player and surrounding players.
   *
   * @param allPlayers the array of player promises
   * @param targetPlayer the target player to find
   * @param type the ranking type
   * @param getRank the function to get rank for a player and type
   * @returns the processed result array
   */
  private static async processPlayersAndBuildResult(
    allPlayers: Promise<ScoreSaberPlayer | undefined>[],
    targetPlayer: ScoreSaberPlayer,
    type: MiniRankingType,
    getRank: (player: ScoreSaberPlayer, type: MiniRankingType) => number | undefined
  ): Promise<ScoreSaberPlayer[]> {
    // Await all player promises and then sort
    const resolvedPlayers = await Promise.all(allPlayers);
    const sortedPlayers = resolvedPlayers
      .filter((player): player is NonNullable<typeof player> => player !== undefined)
      .sort((a, b) => {
        const rankA = getRank(a, type);
        const rankB = getRank(b, type);
        if (rankA == undefined || rankB == undefined) return 0;
        return rankA - rankB;
      });

    // Find the target player
    const playerIndex = sortedPlayers.findIndex(p => p.id === targetPlayer.id);
    if (playerIndex === -1) {
      return [];
    }

    // Get exactly 5 players: 3 above, the player, and 1 below
    const result = [];

    // Add 3 players above (if available)
    for (let i = Math.max(0, playerIndex - 3); i < playerIndex; i++) {
      result.push(sortedPlayers[i]);
    }

    // Add the requested player
    result.push(sortedPlayers[playerIndex]);

    // Add players below to fill up to 5 total players
    const playersBelowNeeded = Math.max(1, 5 - result.length); // At least 1, but more if needed to reach 5

    for (
      let i = playerIndex + 1;
      i < Math.min(sortedPlayers.length, playerIndex + 1 + playersBelowNeeded);
      i++
    ) {
      result.push(sortedPlayers[i]);
    }

    return result;
  }
}
