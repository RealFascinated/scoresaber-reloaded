import { DetailType } from "@ssr/common/detail-type";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import {
  ScoreSaberScore,
  ScoreSaberScoreModel,
} from "@ssr/common/model/score/impl/scoresaber-score";
import { Page, Pagination } from "@ssr/common/pagination";
import { PlayerScore } from "@ssr/common/score/player-score";
import { NotFoundError } from "elysia";
import { fetchWithCache } from "../../common/cache.util";
import { scoreToObject } from "../../common/score/score.util";
import CacheService, { ServiceCache } from "../cache.service";
import LeaderboardService from "../scoresaber/leaderboard.service";
import { ScoreService } from "./score.service";

const ITEMS_PER_PAGE = 8;
const MAX_TOTAL_SCORES = 100;

export class FriendScoresService {
  /**
   * Gets friend scores for a leaderboard.
   *
   * @param friendIds the friend ids
   * @param leaderboardId the leaderboard id
   * @param page the page to fetch
   */
  public static async getFriendLeaderboardScores(
    friendIds: string[],
    leaderboardId: number,
    page: number
  ): Promise<Page<ScoreSaberScore>> {
    const scores: ScoreSaberScore[] = await fetchWithCache(
      CacheService.getCache(ServiceCache.FriendScores),
      `friend-scores-leaderboard:${friendIds.join(",")}-${leaderboardId}`,
      async () => {
        const leaderboard = await LeaderboardService.getLeaderboard(leaderboardId + "", {
          includeBeatSaver: false,
          cacheOnly: true,
        });
        if (!leaderboard) {
          throw new NotFoundError(`Leaderboard "${leaderboardId}" not found`);
        }

        // Use aggregation pipeline for better performance
        const friendScores = await ScoreSaberScoreModel.aggregate([
          {
            $match: {
              playerId: { $in: friendIds },
              leaderboardId: leaderboardId,
            },
          },
          {
            $sort: {
              timestamp: -1,
              score: -1,
            },
          },
        ])
          .hint({ playerId: 1, leaderboardId: 1, timestamp: -1 })
          .allowDiskUse(true);

        if (!friendScores.length) {
          throw new NotFoundError(
            `No scores found for friends "${friendIds.join(",")}" in leaderboard "${leaderboardId}"`
          );
        }

        // Process scores in parallel with batching
        const batchSize = 10;
        const scoreBatches = [];
        for (let i = 0; i < friendScores.length; i += batchSize) {
          scoreBatches.push(friendScores.slice(i, i + batchSize));
        }

        const processedBatches = await Promise.all(
          scoreBatches.map(async batch => {
            const batchPromises = batch.map(async friendScore =>
              ScoreService.insertScoreData(
                scoreToObject(friendScore),
                leaderboard.leaderboard,
                undefined,
                {
                  insertAdditionalData: true,
                  insertPreviousScore: false,
                  insertPlayerInfo: true,
                }
              )
            );
            return Promise.all(batchPromises);
          })
        );

        return processedBatches.flat();
      }
    );

    const pagination = new Pagination<ScoreSaberScore>();
    pagination.setItems(scores);
    pagination.setTotalItems(scores.length);
    pagination.setItemsPerPage(8);
    return pagination.getPage(page);
  }

  /**
   * Gets friend scores for a leaderboard.
   *
   * @param friendIds the friend ids
   * @param leaderboardId the leaderboard id
   * @param page the page to fetch
   */
  public static async getFriendScores(
    friendIds: string[],
    page: number
  ): Promise<Page<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>>> {
    const skip = (page - 1) * ITEMS_PER_PAGE;
    const limit = ITEMS_PER_PAGE;

    // Get total count for pagination, limited to MAX_TOTAL_SCORES
    const totalCount = Math.min(
      await ScoreSaberScoreModel.countDocuments({
        playerId: { $in: friendIds },
      }),
      MAX_TOTAL_SCORES
    );

    const scores: PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>[] = await fetchWithCache(
      CacheService.getCache(ServiceCache.FriendScores),
      `friend-scores:${friendIds.join(",")}:${page}`,
      async () => {
        // Use aggregation pipeline for better performance
        const friendScores = await ScoreSaberScoreModel.aggregate([
          {
            $match: {
              playerId: { $in: friendIds },
            },
          },
          {
            $sort: {
              timestamp: -1,
            },
          },
          {
            $limit: MAX_TOTAL_SCORES,
          },
          {
            $skip: skip,
          },
          {
            $limit: limit,
          },
        ]).allowDiskUse(true);

        // Get all leaderboard IDs at once
        const leaderboardIds = friendScores.map(score => score.leaderboardId + "");

        // Fetch all leaderboards in parallel with batching
        const batchSize = 10;
        const leaderboardBatches = [];
        for (let i = 0; i < leaderboardIds.length; i += batchSize) {
          leaderboardBatches.push(leaderboardIds.slice(i, i + batchSize));
        }

        const leaderboardResults = await Promise.all(
          leaderboardBatches.map(async batch => {
            const batchPromises = batch.map(id =>
              LeaderboardService.getLeaderboard(id, {
                includeBeatSaver: true,
                beatSaverType: DetailType.FULL,
              })
            );
            return Promise.all(batchPromises);
          })
        );

        // Create a map for quick leaderboard lookup
        const leaderboardMap = new Map(
          leaderboardResults
            .flat()
            .filter(Boolean)
            .map(result => [result!.leaderboard.id, result!])
        );

        // Process scores in parallel with batching
        const scoreBatches = [];
        for (let i = 0; i < friendScores.length; i += batchSize) {
          scoreBatches.push(friendScores.slice(i, i + batchSize));
        }

        const processedBatches = await Promise.all(
          scoreBatches.map(async batch => {
            const batchPromises = batch.map(async friendScore => {
              const score = scoreToObject(friendScore);
              const leaderboardResponse = leaderboardMap.get(Number(friendScore.leaderboardId));
              if (!leaderboardResponse) return null;

              return {
                score: await ScoreService.insertScoreData(score),
                leaderboard: leaderboardResponse.leaderboard,
                beatSaver: leaderboardResponse.beatsaver,
              };
            });
            return Promise.all(batchPromises);
          })
        );

        return processedBatches.flat().filter(Boolean) as PlayerScore<
          ScoreSaberScore,
          ScoreSaberLeaderboard
        >[];
      }
    );

    const pagination = new Pagination<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>>();
    pagination.setItems(scores);
    pagination.setTotalItems(totalCount);
    pagination.setItemsPerPage(ITEMS_PER_PAGE);
    return pagination.getPage(page);
  }
}
