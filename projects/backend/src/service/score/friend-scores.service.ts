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
import { PlayerCoreService } from "../player/player-core.service";
import LeaderboardService from "../scoresaber/leaderboard.service";
import { ScoreService } from "./score.service";

const FRIEND_SCORES_LIMIT = 100;

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

        const scores: ScoreSaberScore[] = [];
        for (const friendId of friendIds) {
          await PlayerCoreService.getPlayer(friendId); // Ensures player exists

          const friendScores = await ScoreSaberScoreModel.aggregate([
            { $match: { playerId: friendId, leaderboardId: leaderboardId } },
            { $sort: { timestamp: -1 } },
            { $sort: { score: -1 } },
          ]);
          for (const friendScore of friendScores) {
            scores.push(
              await ScoreService.insertScoreData(
                scoreToObject(friendScore),
                leaderboard.leaderboard,
                {
                  insertAdditionalData: true,
                  insertPreviousScore: false,
                  insertPlayerInfo: true,
                }
              )
            );
          }
        }

        return scores;
      }
    );

    if (scores.length === 0) {
      throw new NotFoundError(
        `No scores found for friends "${friendIds.join(",")}" in leaderboard "${leaderboardId}"`
      );
    }

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
    for (const friendId of friendIds) {
      if (!(await PlayerCoreService.playerExists(friendId))) {
        throw new NotFoundError(`Friend "${friendId}" not found`);
      }
    }

    const scores: PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>[] = await fetchWithCache(
      CacheService.getCache(ServiceCache.FriendScores),
      `friend-scores:${friendIds.join(",")}`,
      async () => {
        const scores: PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>[] = [];
        const friendScores = await ScoreSaberScoreModel.aggregate([
          { $match: { playerId: { $in: friendIds } } },
          { $sort: { timestamp: -1 } },
          { $limit: FRIEND_SCORES_LIMIT },
        ]);

        for (const friendScore of friendScores) {
          const score = scoreToObject(friendScore);
          const leaderboardResponse = await LeaderboardService.getLeaderboard(
            friendScore.leaderboardId + "",
            {
              includeBeatSaver: true,
              beatSaverType: DetailType.FULL,
            }
          );
          const leaderboard = leaderboardResponse.leaderboard;

          scores.push({
            score: await ScoreService.insertScoreData(score),
            leaderboard: leaderboard,
            beatSaver: leaderboardResponse.beatsaver,
          });
        }

        return scores;
      }
    );

    if (scores.length === 0) {
      throw new NotFoundError(`No scores found!`);
    }

    // Sort scores by timestamp
    scores.sort((a, b) => b.score.timestamp.getTime() - a.score.timestamp.getTime());

    const pagination = new Pagination<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>>();
    pagination.setItems(scores);
    pagination.setTotalItems(scores.length);
    pagination.setItemsPerPage(8);

    return pagination.getPage(page);
  }
}
