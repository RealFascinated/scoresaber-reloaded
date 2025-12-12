import { DetailType } from "@ssr/common/detail-type";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import {
  ScoreSaberScore,
  ScoreSaberScoreModel,
} from "@ssr/common/model/score/impl/scoresaber-score";
import { Page, Pagination } from "@ssr/common/pagination";
import { PlayerScore } from "@ssr/common/score/player-score";
import { processInBatches } from "@ssr/common/utils/batch-utils";
import { scoreToObject } from "../../common/score/score.util";
import { LeaderboardCoreService } from "../leaderboard/leaderboard-core.service";
import { ScoreCoreService } from "../score/score-core.service";

const ITEMS_PER_PAGE = 8;
const MAX_TOTAL_SCORES = 1000;

export class PlayerFriendScoresService {
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
    const leaderboard = await LeaderboardCoreService.getLeaderboard(leaderboardId + "", {
      includeBeatSaver: false,
    });

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
    ]);

    if (!friendScores.length) {
      throw new NotFoundError(
        `No scores found for friends "${friendIds.join(",")}" in leaderboard "${leaderboardId}"`
      );
    }

    // Process scores in parallel with batching
    const scores: ScoreSaberScore[] = [];
    await processInBatches(friendScores, 10, async friendScore => {
      const processedScore = await ScoreCoreService.insertScoreData(
        scoreToObject(friendScore),
        leaderboard.leaderboard,
        {
          insertAdditionalData: true,
          insertPreviousScore: false,
          insertPlayerInfo: true,
          removeScoreWeightAndRank: true,
        }
      );
      scores.push(processedScore);
    });
    return new Pagination<ScoreSaberScore>()
      .setItems(scores.sort((a, b) => b.score - a.score))
      .setTotalItems(scores.length)
      .setItemsPerPage(8)
      .getPage(page);
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

    // Get total count for pagination
    const totalCount = Math.min(
      await ScoreSaberScoreModel.countDocuments({
        playerId: { $in: friendIds },
      }),
      MAX_TOTAL_SCORES
    );

    return new Pagination<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>>()
      .setTotalItems(totalCount)
      .setItemsPerPage(ITEMS_PER_PAGE)
      .getPage(page, async () => {
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
            $skip: skip,
          },
          {
            $limit: limit,
          },
        ]);

        if (!friendScores.length) {
          return [];
        }

        // Get all leaderboard IDs for the current page
        const leaderboardIds = friendScores.map(score => score.leaderboardId + "");

        // Fetch all leaderboards in parallel using getLeaderboards
        const leaderboardResults = await LeaderboardCoreService.getLeaderboards(leaderboardIds, {
          includeBeatSaver: true,
          beatSaverType: DetailType.FULL,
        });

        // Create a map for quick leaderboard lookup
        const leaderboardMap = new Map(
          leaderboardResults.map(result => [result.leaderboard.id, result])
        );

        // Process scores
        const scores = await Promise.all(
          friendScores.map(async friendScore => {
            const score = scoreToObject(friendScore);
            const leaderboardResponse = leaderboardMap.get(Number(friendScore.leaderboardId));
            if (!leaderboardResponse) {
              return null;
            }

            return {
              score: await ScoreCoreService.insertScoreData(
                score,
                leaderboardResponse.leaderboard,
                {
                  insertPlayerInfo: true,
                  removeScoreWeightAndRank: true,
                }
              ),
              leaderboard: leaderboardResponse.leaderboard,
              beatSaver: leaderboardResponse.beatsaver,
            };
          })
        );

        return scores.filter(Boolean) as PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>[];
      });
  }
}
