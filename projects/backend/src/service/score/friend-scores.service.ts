import { ScoreSaberScore, ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { Page, Pagination } from "@ssr/common/pagination";
import { NotFoundError } from "elysia";
import { fetchWithCache } from "../../common/cache.util";
import { scoreToObject } from "../../common/score/score.util";
import CacheService, { ServiceCache } from "../cache.service";
import { PlayerService } from "../player.service";
import { ScoreService } from "./score.service";

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
      `friend-scores:${friendIds.join(",")}-${leaderboardId}`,
      async () => {
        const scores: ScoreSaberScore[] = [];
        for (const friendId of friendIds) {
          await PlayerService.getPlayer(friendId); // Ensures player exists

          const friendScores = await ScoreSaberScoreModel.aggregate([
            { $match: { playerId: friendId, leaderboardId: leaderboardId } },
            { $sort: { timestamp: -1 } },
            { $sort: { score: -1 } },
          ]);
          for (const friendScore of friendScores) {
            const score = scoreToObject(friendScore);
            scores.push(await ScoreService.insertScoreData(score));
          }
        }

        return scores;
      }
    );

    if (scores.length === 0) {
      throw new NotFoundError(`No scores found for friends "${friendIds.join(",")}" in leaderboard "${leaderboardId}"`);
    }

    const pagination = new Pagination<ScoreSaberScore>();
    pagination.setItems(scores);
    pagination.setTotalItems(scores.length);
    pagination.setItemsPerPage(8);
    return pagination.getPage(page);
  }
}
