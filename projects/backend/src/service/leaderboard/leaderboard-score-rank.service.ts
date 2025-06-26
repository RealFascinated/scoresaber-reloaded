import { BadRequestError } from "@ssr/common/error/bad-request-error";
import Logger from "@ssr/common/logger";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { formatDuration } from "@ssr/common/utils/time-utils";

export class LeaderboardScoreRankService {
  /**
   * Refresh the rank of the scores for a given leaderboard
   *
   * @param leaderboard the leaderboard to refresh the scores rank for
   */
  public static async refreshLeaderboardScoresRank(leaderboard: ScoreSaberLeaderboard): Promise<{
    scoresCount: number;
    timeTaken: number;
  }> {
    const before = performance.now();
    if (!leaderboard.ranked) {
      throw new BadRequestError("Leaderboard is not ranked, refreshing scores rank is not allowed");
    }
    if (!leaderboard.seededScores) {
      return {
        scoresCount: 0,
        timeTaken: 0,
      };
    }

    const scoresCount = await ScoreSaberScoreModel.countDocuments({
      leaderboardId: leaderboard.id,
    });

    // Use a simple and fast approach: get sorted scores and bulk update
    const scores = await ScoreSaberScoreModel.aggregate([
      { $match: { leaderboardId: leaderboard.id } },
      { $sort: { modifiedScore: -1 } },
      { $project: { _id: 1 } },
    ]);

    // Bulk update with calculated ranks
    await ScoreSaberScoreModel.bulkWrite(
      scores.map((score, index) => ({
        updateOne: {
          filter: { _id: score._id.toString() },
          update: { rank: index + 1 },
        },
      }))
    );

    const after = performance.now();
    Logger.info(
      `[LEADERBOARD] Score ranks refreshed in ${formatDuration(after - before)} for leaderboard ${leaderboard.id} (${scoresCount} scores)`
    );

    return {
      scoresCount,
      timeTaken: after - before,
    };
  }
}
