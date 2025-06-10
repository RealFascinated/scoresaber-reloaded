import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { DetailType } from "@ssr/common/detail-type";
import Logger from "@ssr/common/logger";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import {
  scoreSaberCachedPlayerToObject,
  ScoreSaberPlayerCacheDocument,
  ScoreSaberPlayerCacheModel,
} from "@ssr/common/model/scoresaber-player-cache";
import { Page, Pagination } from "@ssr/common/pagination";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerScore } from "@ssr/common/score/player-score";
import { ScoreSaberScoreSort } from "@ssr/common/score/score-sort";
import { getScoreSaberScoreFromToken } from "@ssr/common/token-creators";
import { ScoreSaberLeaderboardPlayerInfoToken } from "@ssr/common/types/token/scoresaber/leaderboard-player-info";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { getPlayerStatisticChanges } from "@ssr/common/utils/player-utils";
import { getDaysAgoDate } from "@ssr/common/utils/time-utils";
import { getPageFromRank } from "@ssr/common/utils/utils";
import { NotFoundError } from "elysia";
import sanitize from "sanitize-html";
import { fetchWithCache } from "../../common/cache.util";
import CacheService, { ServiceCache } from "../cache.service";
import { PlayerAccuracyService } from "../player/player-accuracy.service";
import { PlayerCoreService } from "../player/player-core.service";
import { PlayerHistoryService } from "../player/player-history.service";
import { PlayerRankingService } from "../player/player-ranking.service";
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
        const account = await PlayerCoreService.getPlayer(id, createIfMissing, playerToken).catch(
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
          hmd: await PlayerCoreService.getPlayerHMD(playerToken.id),
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
          account ? PlayerRankingService.updatePeakRank(id, playerToken) : undefined,
          account ? PlayerRankingService.getPlayerPpBoundary(id, 50) : [],
          account ? PlayerAccuracyService.getAccBadges(id) : {},
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
    search?: string
  ): Promise<Page<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>>> {
    return await fetchWithCache(
      CacheService.getCache(ServiceCache.PlayerScores),
      `player-scores:${playerId}-${pageNumber}-${sort}-${search}`,
      async () => {
        // Get first page to determine total items
        const firstPage = await ApiServiceRegistry.getInstance()
          .getScoreSaberService()
          .lookupPlayerScores({
            playerId,
            page: 1,
            sort: sort as ScoreSaberScoreSort,
            search,
          });

        if (firstPage == undefined) {
          return Pagination.empty<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>>();
        }

        const pagination = new Pagination<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>>()
          .setItemsPerPage(firstPage.metadata.itemsPerPage)
          .setTotalItems(firstPage.metadata.total);

        // Get the requested page
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

        return await pagination.getPage(pageNumber, async () => {
          // Process all scores in parallel
          const scorePromises = requestedPage.playerScores.map(async playerScore => {
            const leaderboardResponse = await LeaderboardService.getLeaderboard(
              playerScore.leaderboard.id + "",
              {
                includeBeatSaver: true,
                beatSaverType: DetailType.FULL,
              }
            );

            if (!leaderboardResponse) {
              return undefined;
            }

            const { leaderboard, beatsaver } = leaderboardResponse;
            let score = getScoreSaberScoreFromToken(playerScore.score, leaderboard, playerId);
            if (!score) {
              return undefined;
            }

            score = await ScoreService.insertScoreData(score, leaderboard);
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
    );
  }
}
