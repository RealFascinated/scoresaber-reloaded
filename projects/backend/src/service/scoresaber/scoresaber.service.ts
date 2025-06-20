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
import { ScoreSaberLeaderboardPlayerInfoToken } from "@ssr/common/types/token/scoresaber/leaderboard-player-info";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { getPlayerStatisticChanges } from "@ssr/common/utils/player-utils";
import { getDaysAgoDate } from "@ssr/common/utils/time-utils";
import { getPageFromRank } from "@ssr/common/utils/utils";
import sanitize from "sanitize-html";
import CacheService, { CacheId } from "../cache.service";
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
    playerToken?: ScoreSaberPlayerToken
  ): Promise<ScoreSaberPlayer> {
    return CacheService.fetchWithCache(
      CacheId.ScoreSaber,
      `scoresaber:player:${id}:${type}`,
      async () => {
        // Start fetching player token and account in parallel
        const [player, account] = await Promise.all([
          playerToken ?? ApiServiceRegistry.getInstance().getScoreSaberService().lookupPlayer(id),
          PlayerService.getPlayer(id).catch(() => undefined),
        ]);

        if (!player) {
          throw new NotFoundError(`Player "${id}" not found`);
        }

        // For basic type, return early with minimal data
        const basePlayer = {
          id: player.id,
          name: player.name,
          avatar: player.profilePicture,
          country: player.country,
          rank: player.rank,
          countryRank: player.countryRank,
          pp: player.pp,
          hmd: await PlayerService.getPlayerHMD(player.id),
          joinedDate: new Date(player.firstSeen),
          role: player.role ?? undefined,
          permissions: player.permissions,
          banned: player.banned,
          inactive: player.inactive,
          trackedSince: account?.trackedSince ?? new Date(),
          rankPages: {
            global: getPageFromRank(player.rank, 50),
            country: getPageFromRank(player.countryRank, 50),
          },
        } as ScoreSaberPlayer;

        if (type === DetailType.BASIC) {
          return basePlayer;
        }

        // For full type, run all operations in parallel
        const [updatedAccount, ppBoundaries, accBadges, statisticHistory, playerHMD] =
          await Promise.all([
            account ? PlayerService.updatePeakRank(id, player) : undefined,
            account ? PlayerService.getPlayerPpBoundary(id, 1) : [],
            account ? PlayerService.getAccBadges(id) : {},
            PlayerHistoryService.getPlayerStatisticHistory(player, new Date(), getDaysAgoDate(30)),
            PlayerService.getPlayerHMD(player.id),
            PlayerService.updatePlayerName(player.id, player.name),
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
            lines: player.bio ? sanitize(player.bio).split("\n") : [],
            linesStripped: player.bio
              ? sanitize(player.bio.replace(/<[^>]+>/g, "")).split("\n")
              : [],
          },
          badges:
            player.badges?.map(badge => ({
              url: badge.image,
              description: badge.description,
            })) || [],
          statisticChange: {
            daily: dailyChanges,
            weekly: weeklyChanges,
            monthly: monthlyChanges,
          },
          plusOnePP: ppBoundaries[0],
          accBadges,
          peakRank: updatedAccount?.peakRank,
          statistics: player.scoreStats,
          rankPages: {
            global: getPageFromRank(player.rank, 50),
            country: getPageFromRank(player.countryRank, 50),
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
      // Fetch all leaderboards in parallel using getLeaderboards
      const leaderboardResponses = await LeaderboardService.getLeaderboards(leaderboardIds, {
        includeBeatSaver: true,
        beatSaverType: DetailType.FULL,
      });

      // Create a map for quick leaderboard lookup
      const leaderboardMap = new Map(
        leaderboardResponses.map(result => [result.leaderboard.id, result])
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
        uniquePlayerIds.map(id =>
          ScoreSaberService.getPlayer(
            id,
            DetailType.BASIC,
            scoreSaberPlayerTokens?.find(token => token.id === id)
          )
        )
      )
    ).sort((a, b) => {
      if (a.inactive && !b.inactive) return 1;
      if (!a.inactive && b.inactive) return -1;
      return a.rank - b.rank;
    });
  }
}
