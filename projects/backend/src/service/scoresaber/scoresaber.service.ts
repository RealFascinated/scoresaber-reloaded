import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { DetailType } from "@ssr/common/detail-type";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger from "@ssr/common/logger";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import {
  scoreSaberCachedPlayerToObject,
  ScoreSaberPlayerCacheDocument,
  ScoreSaberPlayerCacheModel,
} from "@ssr/common/model/scoresaber-player-cache";
import { Pagination } from "@ssr/common/pagination";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerScoresResponse } from "@ssr/common/response/player-scores-response";
import { PlayerScore } from "@ssr/common/score/player-score";
import { ScoreSaberScoreSort } from "@ssr/common/score/score-sort";
import { getScoreSaberScoreFromToken } from "@ssr/common/token-creators";
import { AroundPlayer } from "@ssr/common/types/around-player";
import { ScoreSaberLeaderboardPlayerInfoToken } from "@ssr/common/types/token/scoresaber/leaderboard-player-info";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { getPlayerStatisticChanges } from "@ssr/common/utils/player-utils";
import { getDaysAgoDate } from "@ssr/common/utils/time-utils";
import { getPageFromRank } from "@ssr/common/utils/utils";
import sanitize from "sanitize-html";
import { fetchWithCache } from "../../common/cache.util";
import CacheService, { ServiceCache } from "../cache.service";
import { PlayerHistoryService } from "../player/player-history.service";
import { PlayerService } from "../player/player.service";
import { ScoreService } from "../score/score.service";
import LeaderboardService from "./leaderboard.service";

export default class ScoreSaberService {
  /**
   * Gets a ScoreSaber player using their account id.
   *
   * @param id the player's account id
   * @param createIfMissing creates the player if they don't have an account with us
   * @returns the player
   */
  public static async getPlayer(
    id: string,
    type: DetailType = DetailType.BASIC,
    options?: { createIfMissing?: boolean }
  ): Promise<ScoreSaberPlayer> {
    const { createIfMissing = false } = options || {};

    return fetchWithCache<ScoreSaberPlayer>(
      CacheService.getCache(ServiceCache.ScoreSaber),
      `player:${id}:${type}`,
      async () => {
        const playerToken = await ApiServiceRegistry.getInstance()
          .getScoreSaberService()
          .lookupPlayer(id);
        const account = await PlayerService.getPlayer(id, createIfMissing, playerToken).catch(
          () => undefined
        );

        if (!playerToken) {
          throw new NotFoundError(`Player "${id}" not found`);
        }

        // For basic type, return early with minimal data
        const basePlayer = {
          id: playerToken.id,
          name: playerToken.name,
          avatar: playerToken.profilePicture,
          country: playerToken.country,
          rank: playerToken.rank,
          countryRank: playerToken.countryRank,
          pp: playerToken.pp,
          hmd: await PlayerService.getPlayerHMD(playerToken.id),
          joinedDate: new Date(playerToken.firstSeen),
          role: playerToken.role ?? undefined,
          permissions: playerToken.permissions,
          banned: playerToken.banned,
          inactive: playerToken.inactive,
          isBeingTracked: account !== undefined,
        } as ScoreSaberPlayer;

        if (type === DetailType.BASIC) {
          return basePlayer;
        }

        // For full type, run these operations in parallel
        const [updatedAccount, ppBoundaries, accBadges] = await Promise.all([
          account ? PlayerService.updatePeakRank(id, playerToken) : undefined,
          account ? PlayerService.getPlayerPpBoundary(id, 50) : [],
          account ? PlayerService.getAccBadges(id) : {},
        ]);

        const statisticHistory = await PlayerHistoryService.getPlayerStatisticHistory(
          playerToken,

          new Date(),
          getDaysAgoDate(30)
        );

        return {
          ...basePlayer,
          bio: {
            lines: playerToken.bio ? sanitize(playerToken.bio).split("\n") : [],
            linesStripped: playerToken.bio
              ? sanitize(playerToken.bio.replace(/<[^>]+>/g, "")).split("\n")
              : [],
          },
          badges:
            playerToken.badges?.map(badge => ({
              url: badge.image,
              description: badge.description,
            })) || [],
          statisticChange: {
            daily: account ? await getPlayerStatisticChanges(statisticHistory, 1) : {},
            weekly: account ? await getPlayerStatisticChanges(statisticHistory, 7) : {},
            monthly: account ? await getPlayerStatisticChanges(statisticHistory, 30) : {},
          },
          ppBoundaries,
          accBadges,
          peakRank: updatedAccount?.peakRank,
          statistics: playerToken.scoreStats,
          rankPages: {
            global: getPageFromRank(playerToken.rank, 50),
            country: getPageFromRank(playerToken.countryRank, 50),
          },
        } as ScoreSaberPlayer;
      }
    );
  }

  /**
   * Gets a cached ScoreSaber player token.
   *
   * @param id the player's id
   * @param cacheOnly whether to only check the cache
   * @returns the player token
   */
  public static async getCachedPlayer(
    id: string,
    cacheOnly: boolean = false
  ): Promise<ScoreSaberPlayerToken> {
    if (await ScoreSaberPlayerCacheModel.exists({ _id: id })) {
      const player = await ScoreSaberPlayerCacheModel.findOne({ _id: id }).lean();

      // Check the cache status of the player
      if (
        player &&
        ((player.lastUpdated &&
          // If the player was updated less than 6 hours ago, return the cached player
          new Date().getTime() - player.lastUpdated.getTime() < 6 * 60 * 60 * 1000) ||
          // If the player was last updated more than 3 days ago, update the player reguardless of the cache only flag
          (cacheOnly &&
            new Date().getTime() - player.lastUpdated.getTime() < 3 * 24 * 60 * 60 * 1000))
      ) {
        return scoreSaberCachedPlayerToObject(player as unknown as ScoreSaberPlayerCacheDocument);
      }
    }

    // Fetch the player from the API
    const player = await ApiServiceRegistry.getInstance().getScoreSaberService().lookupPlayer(id);
    if (!player) {
      throw new NotFoundError(`Player "${id}" not found`);
    }

    // Update the player in the cache
    return scoreSaberCachedPlayerToObject(
      (await ScoreSaberPlayerCacheModel.findOneAndUpdate(
        { _id: id },
        {
          ...player,
          lastUpdated: new Date(),
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      ).lean()) as unknown as ScoreSaberPlayerCacheDocument
    );
  }

  /**
   * Updates the player token inside the player cache.
   *
   * @param player the player to update
   */
  public static async updatePlayerCache(
    playerToken: ScoreSaberPlayerToken | ScoreSaberLeaderboardPlayerInfoToken
  ): Promise<ScoreSaberPlayerToken | undefined> {
    const player = await this.getCachedPlayer(playerToken.id, true).catch(() => undefined);
    if (player == undefined) {
      Logger.warn(`Player "${playerToken.id}" not found on ScoreSaber`);
      return undefined;
    }

    // Check if the player has changed
    if (playerToken.name !== player.name || playerToken.country !== player.country) {
      return scoreSaberCachedPlayerToObject(
        (await ScoreSaberPlayerCacheModel.findOneAndUpdate(
          { _id: player.id },
          {
            $set: {
              name: playerToken.name,
              country: playerToken.country,
            },
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          }
        ).lean()) as unknown as ScoreSaberPlayerCacheDocument
      );
    }

    return player;
  }

  /**
   * Looks up player scores.
   *
   * @param playerId the player id
   * @param pageNumber the page to get
   * @param sort the sort to get
   * @param search the search to get
   */
  public static async lookupPlayerScores(
    playerId: string,
    pageNumber: number,
    sort: string,
    search?: string,
    comparisonPlayerId?: string
  ): Promise<PlayerScoresResponse> {
    // Get the requested page directly
    const requestedPage = await ApiServiceRegistry.getInstance()
      .getScoreSaberService()
      .lookupPlayerScores({
        playerId,
        page: pageNumber,
        sort: sort as ScoreSaberScoreSort,
        search,
      });

    if (!requestedPage) {
      return Pagination.empty<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>>();
    }

    const pagination = new Pagination<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>>()
      .setItemsPerPage(requestedPage.metadata.itemsPerPage)
      .setTotalItems(requestedPage.metadata.total);

    // Fetch the comparison player if it's not the same as the player
    const comparisonPlayer =
      comparisonPlayerId !== playerId && comparisonPlayerId !== undefined
        ? await ScoreSaberService.getPlayer(comparisonPlayerId, DetailType.BASIC)
        : undefined;

    return await pagination.getPage(pageNumber, async () => {
      // Get all leaderboard IDs at once
      const leaderboardIds = requestedPage.playerScores.map(score => score.leaderboard.id + "");

      // Fetch all leaderboards in parallel
      const leaderboardPromises = leaderboardIds.map(id =>
        LeaderboardService.getLeaderboard(id, {
          includeBeatSaver: true,
          beatSaverType: DetailType.FULL,
        })
      );
      const leaderboardResponses = await Promise.all(leaderboardPromises);

      // Create a map for quick leaderboard lookup
      const leaderboardMap = new Map(
        leaderboardResponses.filter(Boolean).map(result => [result!.leaderboard.id, result!])
      );

      // Process all scores in parallel
      const scorePromises = requestedPage.playerScores.map(async playerScore => {
        const leaderboardResponse = leaderboardMap.get(playerScore.leaderboard.id);
        if (!leaderboardResponse) {
          return undefined;
        }

        const { leaderboard, beatsaver } = leaderboardResponse;
        let score = getScoreSaberScoreFromToken(playerScore.score, leaderboard, playerId);
        if (!score) {
          return undefined;
        }

        score = await ScoreService.insertScoreData(score, leaderboard, comparisonPlayer);
        return {
          score: score,
          leaderboard: leaderboard,
          beatSaver: beatsaver,
        } as PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>;
      });

      // Wait for all score processing to complete and filter out any undefined results
      return (await Promise.all(scorePromises)).filter(Boolean) as PlayerScore<
        ScoreSaberScore,
        ScoreSaberLeaderboard
      >[];
    });
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
