import { NotFoundError } from "@ssr/common/error/not-found-error";
import { Pagination } from "@ssr/common/pagination";
import type { ScoreSaberScoresPageResponse } from "@ssr/common/schemas/response/score/scoresaber-scores-page";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { scoreSaberScoreRowToType } from "../../db/converter/scoresaber-score";
import { ScoreSaberScoresRepository } from "../../repositories/scoresaber-scores.repository";
import { ScoreSaberLeaderboardsService } from "../leaderboard/scoresaber-leaderboards.service";
import { ScoreCoreService } from "../score/score-core.service";

export class PlayerFollowingScoresService {
  /**
   * Gets following scores for a leaderboard.
   *
   * @param followingIds the followed player ids
   * @param leaderboardId the leaderboard id
   * @param page the page to fetch
   * @param realmId the realm to resolve pp for
   */
  public static async getFollowingLeaderboardScores(
    followingIds: string[],
    leaderboardId: number,
    page: number,
    realmId: number
  ): Promise<ScoreSaberScoresPageResponse> {
    const leaderboard = await ScoreSaberLeaderboardsService.getLeaderboard(leaderboardId, realmId);
    if (!leaderboard) {
      throw new NotFoundError(`Leaderboard "${leaderboardId}" not found`);
    }

    const limit = 8;
    const offset = (page - 1) * limit;
    const total = await ScoreSaberScoresRepository.countFollowingScoresOnLeaderboard(
      followingIds,
      leaderboardId
    );

    if (total === 0) {
      throw new NotFoundError(
        `No scores found for followed players "${followingIds.join(",")}" in leaderboard "${leaderboardId}"`
      );
    }

    const pagination = new Pagination<ScoreSaberScore>().setTotalItems(total).setItemsPerPage(limit);

    return pagination.getPage(page, async () => {
      const rawScores = await ScoreSaberScoresRepository.findFollowingScoresOnLeaderboardPage(
        followingIds,
        leaderboardId,
        limit,
        offset,
        realmId
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
