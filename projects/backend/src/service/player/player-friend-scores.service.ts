import { NotFoundError } from "@ssr/common/error/not-found-error";
import { Pagination } from "@ssr/common/pagination";
import type { ScoreSaberScoresPageResponse } from "@ssr/common/schemas/response/score/scoresaber-scores-page";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { scoreSaberScoreRowToType } from "../../db/converter/scoresaber-score";
import { ScoreSaberScoresRepository } from "../../repositories/scoresaber-scores.repository";
import { ScoreSaberLeaderboardsService } from "../leaderboard/scoresaber-leaderboards.service";
import { ScoreCoreService } from "../score/score-core.service";

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
  ): Promise<ScoreSaberScoresPageResponse> {
    const leaderboard = await ScoreSaberLeaderboardsService.getLeaderboard(leaderboardId);
    if (!leaderboard) {
      throw new NotFoundError(`Leaderboard "${leaderboardId}" not found`);
    }

    const limit = 8;
    const offset = (page - 1) * limit;
    const total = await ScoreSaberScoresRepository.countFriendScoresOnLeaderboard(friendIds, leaderboardId);

    if (total === 0) {
      throw new NotFoundError(
        `No scores found for friends "${friendIds.join(",")}" in leaderboard "${leaderboardId}"`
      );
    }

    const pagination = new Pagination<ScoreSaberScore>().setTotalItems(total).setItemsPerPage(limit);

    return pagination.getPage(page, async () => {
      const rawScores = await ScoreSaberScoresRepository.findFriendScoresOnLeaderboardPage(
        friendIds,
        leaderboardId,
        limit,
        offset
      );

      if (!rawScores.length) {
        return [];
      }

      return Promise.all(
        rawScores.map(async rawScore => {
          const score = scoreSaberScoreRowToType(rawScore);
          return ScoreCoreService.insertScoreData(score, leaderboard, {
            insertBeatLeaderScore: true,
            insertPreviousScore: false,
            insertPlayerInfo: true,
          });
        })
      );
    });
  }
}
