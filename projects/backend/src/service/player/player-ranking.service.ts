import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerRankedPpsResponse } from "@ssr/common/response/player-ranked-pps-response";
import { AroundPlayer } from "@ssr/common/types/around-player";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { ScoreService } from "../score/score.service";
import ScoreSaberService from "../scoresaber/scoresaber.service";
import { PlayerCoreService } from "./player-core.service";

export class PlayerRankingService {
  /**
   * Gets the ranked pp scores for a player.
   *
   * @param playerId the player's id
   * @returns the ranked pp scores
   */
  public static async getPlayerRankedPps(playerId: string): Promise<PlayerRankedPpsResponse> {
    await PlayerCoreService.ensurePlayerExists(playerId);

    const playerScores = await ScoreService.getPlayerScores(playerId, {
      ranked: true,
      sort: "pp",
      projection: { pp: 1, scoreId: 1 },
      includeLeaderboard: false,
    });

    if (playerScores.length === 0) {
      return {
        scores: [],
      };
    }

    const scores = playerScores.map(score => ({
      pp: score.score.pp,
      scoreId: score.score.scoreId,
    }));

    return {
      scores,
    };
  }

  /**
   * Gets the pp boundary for a player.
   *
   * @param playerId the player's id
   * @param boundary the pp boundary
   */
  public static async getPlayerPpBoundary(
    playerId: string,
    boundary: number = 1
  ): Promise<number[]> {
    await PlayerCoreService.ensurePlayerExists(playerId);

    // Use aggregation to get sorted PPs directly from database
    const sortedPps = await ScoreService.getPlayerScores(playerId, {
      ranked: true,
      sort: "pp",
      projection: { pp: 1 },
      includeLeaderboard: false,
    }).then(scores => scores.map(score => score.score.pp));

    if (sortedPps.length === 0) {
      return [0];
    }

    // Calculate all boundaries in a single pass
    const boundaries: number[] = [];
    for (let i = 1; i <= boundary; i++) {
      boundaries.push(
        ApiServiceRegistry.getInstance().getScoreSaberService().calcPpBoundary(sortedPps, i)
      );
    }

    return boundaries;
  }

  /**
   * Gets the pp boundary amount for a pp value.
   *
   * @param playerId the player's id
   * @param boundary the pp boundary
   */
  public static async getPlayerPpBoundaryFromScorePp(
    playerId: string,
    boundary: number = 1
  ): Promise<number> {
    await PlayerCoreService.ensurePlayerExists(playerId);
    const scoresPps = await this.getPlayerRankedPps(playerId);
    if (scoresPps.scores.length === 0) {
      return 0;
    }

    return ApiServiceRegistry.getInstance()
      .getScoreSaberService()
      .getPpBoundaryForRawPp(
        scoresPps.scores.map(score => score.pp),
        boundary
      );
  }

  /**
   * Updates the player's peak rank.
   *
   * @param playerId the player's id
   * @param playerToken the player's token
   */
  public static async updatePeakRank(playerId: string, playerToken: ScoreSaberPlayerToken) {
    const foundPlayer = await PlayerCoreService.getPlayer(playerId, true);
    if (playerToken.rank == 0) {
      return foundPlayer;
    }

    if (
      !foundPlayer.peakRank ||
      (foundPlayer.peakRank && playerToken.rank < foundPlayer.peakRank.rank)
    ) {
      foundPlayer.peakRank = {
        rank: playerToken.rank,
        date: new Date(),
      };
      foundPlayer.markModified("peakRank");
    }
    await foundPlayer.save();
    return foundPlayer;
  }

  /**
   * Gets the players around a player.
   *
   * @param id the player to get around
   * @param type the type to get around
   */
  public static async getPlayersAroundPlayer(
    id: string,
    type: AroundPlayer
  ): Promise<ScoreSaberPlayerToken[]> {
    const getRank = (player: ScoreSaberPlayer | ScoreSaberPlayerToken, type: AroundPlayer) => {
      switch (type) {
        case "global":
          return player.rank;
        case "country":
          return player.countryRank;
      }
    };

    const player = await ScoreSaberService.getPlayer(id);
    if (player == undefined) {
      throw new NotFoundError(`Player "${id}" not found`);
    }

    const rank = getRank(player, type);
    if (rank <= 0) {
      return []; // Return empty array for invalid ranks
    }

    const itemsPerPage = 50;
    const targetPage = Math.ceil(rank / itemsPerPage);

    // Calculate which pages we need to fetch
    // We need pages that might contain players 2 ranks above and 2 ranks below
    const pagesToFetch: number[] = [];

    // Always fetch the target page
    pagesToFetch.push(targetPage);

    // If player is near the start of their page, we need the previous page
    if (rank % itemsPerPage <= 2) {
      pagesToFetch.push(targetPage - 1);
    }

    // If player is near the end of their page, we need the next page
    if (rank % itemsPerPage >= itemsPerPage - 2) {
      pagesToFetch.push(targetPage + 1);
    }

    // Filter out invalid page numbers
    const validPages = pagesToFetch.filter(page => page > 0);

    // Fetch all pages in parallel
    const pageResponses = await Promise.all(
      validPages.map(page =>
        type === "global"
          ? ApiServiceRegistry.getInstance().getScoreSaberService().lookupPlayers(page)
          : ApiServiceRegistry.getInstance()
              .getScoreSaberService()
              .lookupPlayersByCountry(page, player.country)
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

    // If we don't have enough players above, try to get more from below
    if (start === 0 && result.length < 5) {
      const extraNeeded = 5 - result.length;
      const extraPlayers = allPlayers.slice(end, end + extraNeeded);
      result.push(...extraPlayers);
    }
    // If we don't have enough players below, try to get more from above
    else if (end === allPlayers.length && result.length < 5) {
      const extraNeeded = 5 - result.length;
      const extraPlayers = allPlayers.slice(Math.max(0, start - extraNeeded), start);
      result.unshift(...extraPlayers);
    }

    return result.slice(0, 5); // Ensure we return exactly 5 players
  }
}
