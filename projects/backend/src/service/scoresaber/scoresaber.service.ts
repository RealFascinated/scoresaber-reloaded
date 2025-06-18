import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { DetailType } from "@ssr/common/detail-type";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger from "@ssr/common/logger";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { PlayerModel } from "@ssr/common/model/player";
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
    type: DetailType = DetailType.BASIC
  ): Promise<ScoreSaberPlayer> {
    return fetchWithCache<ScoreSaberPlayer>(
      CacheService.getCache(ServiceCache.ScoreSaber),
      `player:${id}:${type}`,
      async () => {
        // Start fetching player token and account in parallel
        const [playerToken, account] = await Promise.all([
          ApiServiceRegistry.getInstance().getScoreSaberService().lookupPlayer(id),
          PlayerService.getPlayer(id).catch(() => undefined),
        ]);

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
          trackedSince: account?.trackedSince ?? new Date(),
          rankPages: {
            global: getPageFromRank(playerToken.rank, 50),
            country: getPageFromRank(playerToken.countryRank, 50),
          },
        } as ScoreSaberPlayer;

        if (type === DetailType.BASIC) {
          return basePlayer;
        }

        // For full type, run all operations in parallel
        const [updatedAccount, ppBoundaries, accBadges, statisticHistory, playerHMD] =
          await Promise.all([
            account ? PlayerService.updatePeakRank(id, playerToken) : undefined,
            account ? PlayerService.getPlayerPpBoundary(id, 50) : [],
            account ? PlayerService.getAccBadges(id) : {},
            PlayerHistoryService.getPlayerStatisticHistory(
              playerToken,
              new Date(),
              getDaysAgoDate(30)
            ),
            PlayerService.getPlayerHMD(playerToken.id),
            PlayerService.updatePlayerName(playerToken.id, playerToken.name),
          ]);

        // Calculate all statistic changes in parallel
        const [dailyChanges, weeklyChanges, monthlyChanges] = await Promise.all([
          account ? getPlayerStatisticChanges(statisticHistory, 1) : {},
          account ? getPlayerStatisticChanges(statisticHistory, 7) : {},
          account ? getPlayerStatisticChanges(statisticHistory, 30) : {},
        ]);

        return {
          ...basePlayer,
          hmd: playerHMD,
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
            daily: dailyChanges,
            weekly: weeklyChanges,
            monthly: monthlyChanges,
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

    // Start fetching comparison player and leaderboard IDs in parallel
    const [comparisonPlayer, leaderboardIds] = await Promise.all([
      comparisonPlayerId !== playerId && comparisonPlayerId !== undefined
        ? ScoreSaberService.getPlayer(comparisonPlayerId, DetailType.BASIC)
        : undefined,
      requestedPage.playerScores.map(score => score.leaderboard.id + ""),
    ]);

    return await pagination.getPage(pageNumber, async () => {
      // Fetch all leaderboards in parallel with a concurrency limit
      const leaderboardResponses = await Promise.all(
        leaderboardIds.map(id =>
          LeaderboardService.getLeaderboard(id, {
            includeBeatSaver: true,
            beatSaverType: DetailType.FULL,
          })
        )
      );

      // Create a map for quick leaderboard lookup
      const leaderboardMap = new Map(
        leaderboardResponses.filter(Boolean).map(result => [result!.leaderboard.id, result!])
      );

      // Process all scores in parallel with a concurrency limit
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

    return result.slice(0, 5); // Ensure we return exactly 5 players
  }

  /**
   * Searches for players by name.
   *
   * @param query the query to search for
   * @returns the players that match the query
   */
  public static async searchPlayers(query: string): Promise<ScoreSaberPlayer[]> {
    // Run ScoreSaber API call and database query in parallel
    const [scoreSaberResponse, foundPlayers] = await Promise.all([
      ApiServiceRegistry.getInstance().getScoreSaberService().searchPlayers(query),
      query.length > 0
        ? PlayerModel.find({
            name: { $regex: query, $options: "i" },
          }).select(["_id", "name"])
        : [],
    ]);

    const scoreSaberPlayerTokens = scoreSaberResponse?.players;

    // Merge their ids
    const playerIds = foundPlayers.map(player => player._id);
    playerIds.push(...(scoreSaberPlayerTokens?.map(token => token.id) ?? []));

    // Deduplicate the player ids
    const uniquePlayerIds = [...new Set(playerIds)];

    // Get players from ScoreSaber
    return (
      await Promise.all(
        uniquePlayerIds.map(id => ScoreSaberService.getPlayer(id, DetailType.BASIC))
      )
    ).sort((a, b) => {
      if (a.inactive && !b.inactive) return 1;
      if (!a.inactive && b.inactive) return -1;
      return a.rank - b.rank;
    });
  }
}
