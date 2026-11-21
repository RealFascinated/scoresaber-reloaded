import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger, { type ScopedLogger } from "@ssr/common/logger";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { miniRankingCacheKey, miniRankingResponseCacheKey } from "../../common/cache-keys";
import { ScoreSaberApiService } from "../external/scoresaber-api.service";
import CacheService, { CacheId } from "../infra/cache.service";
import ScoreSaberPlayerService from "./scoresaber-player.service";

type MiniRankingType = "global" | "country";

export default class MiniRankingService {
  private static readonly logger: ScopedLogger = Logger.withTopic("Mini Ranking");

  /**
   * Gets the players around a player for both global and country rankings.
   *
   * @param id the player to get around
   * @param realmId the realm to rank within
   */
  public static async getPlayerMiniRankings(id: string, realmId: number) {
    return CacheService.fetch(
      CacheId.SCORESABER_MINI_RANKING_RESPONSE,
      miniRankingResponseCacheKey(id, realmId),
      () => this.buildPlayerMiniRankings(id, realmId)
    );
  }

  private static async buildPlayerMiniRankings(id: string, realmId: number) {
    const player = await ScoreSaberPlayerService.getPlayer(id, "basic", undefined, realmId);
    if (player == undefined) {
      throw new NotFoundError(`Player "${id}" not found`);
    }

    const [globalRankings, countryRankings] = await Promise.all([
      this.getPlayerMiniRanking(player, "global", realmId),
      this.getPlayerMiniRanking(player, "country", realmId),
    ]);

    return {
      globalRankings,
      countryRankings,
    };
  }

  private static async getPlayerMiniRanking(
    player: ScoreSaberPlayer,
    type: MiniRankingType,
    realmId: number
  ) {
    const getRank = (player: ScoreSaberPlayer, type: MiniRankingType) => {
      switch (type) {
        case "global":
          return player.rank;
        case "country":
          return player.countryRank;
      }
    };

    const rank = getRank(player, type);
    if (rank == undefined || rank <= 0) {
      return [];
    }

    const startRank = Math.max(1, rank - 2);
    const endRank = rank + 2;

    const itemsPerPage = 50;
    const startPage = Math.ceil(startRank / itemsPerPage);
    const endPage = Math.ceil(endRank / itemsPerPage);

    const extraPagesNeeded = rank <= 3 ? Math.ceil(5 / itemsPerPage) : 0;
    const finalEndPage = endPage + extraPagesNeeded;

    const pageResponses = await Promise.all(
      Array.from({ length: finalEndPage - startPage + 1 }, (_, i) => startPage + i).map(page =>
        CacheService.fetch(
          CacheId.SCORESABER_MINI_RANKING,
          miniRankingCacheKey(type, page, player.country, realmId),
          async () =>
            ScoreSaberApiService.lookupPlayers(page, {
              ...(type !== "global" ? { country: player.country } : {}),
              realmId,
            })
        )
      )
    );

    const allPlayers = pageResponses.flatMap(response => {
      if (!response.ok) {
        MiniRankingService.logger.warn(
          `Failed to fetch ${type} rankings page for player "${player.id}": ${response.message}`
        );
        return [];
      }
      return response.response.data;
    });
    const tokenRank = (token: (typeof allPlayers)[number]) =>
      type === "global" ? token.stats.rank : token.stats.countryRank;
    const windowTokens = allPlayers.filter(token => {
      const tokenPlayerRank = tokenRank(token);
      return token.id === player.id || (tokenPlayerRank >= startRank - 2 && tokenPlayerRank <= endRank + 5);
    });

    const players = await ScoreSaberPlayerService.getBasicPlayers(windowTokens);

    return this.processPlayersAndBuildResult(players, player, type, getRank);
  }

  private static processPlayersAndBuildResult(
    allPlayers: ScoreSaberPlayer[],
    targetPlayer: ScoreSaberPlayer,
    type: MiniRankingType,
    getRank: (player: ScoreSaberPlayer, type: MiniRankingType) => number | undefined
  ) {
    const sortedPlayers = allPlayers.sort((a, b) => {
      const rankA = getRank(a, type);
      const rankB = getRank(b, type);
      if (rankA == undefined || rankB == undefined) {
        return 0;
      }
      return rankA - rankB;
    });

    const playerIndex = sortedPlayers.findIndex(p => p.id === targetPlayer.id);
    if (playerIndex === -1) {
      return [];
    }

    const result = [];

    for (let i = Math.max(0, playerIndex - 3); i < playerIndex; i++) {
      result.push(sortedPlayers[i]);
    }

    result.push(sortedPlayers[playerIndex]);

    const playersBelowNeeded = Math.max(1, 5 - result.length);

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
