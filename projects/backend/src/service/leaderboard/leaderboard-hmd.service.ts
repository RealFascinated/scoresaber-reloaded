import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { PlaysByHmdResponse } from "@ssr/common/schemas/response/leaderboard/plays-by-hmd";

export class LeaderboardHmdService {
  /**
   * Gets the plays by HMD for a leaderboard
   */
  public static async getPlaysByHmd(leaderboardId: string): Promise<PlaysByHmdResponse> {
    const result = await ScoreSaberScoreModel.aggregate([
      {
        $match: {
          leaderboardId: Number(leaderboardId),
          hmd: { $exists: true, $nin: [null, "Unknown"] },
        },
      },
      {
        $group: {
          _id: "$hmd",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          hmd: "$_id",
          count: 1,
        },
      },
      {
        $sort: { count: -1 },
      },
    ]).exec();

    return result.reduce((acc, curr) => {
      acc[curr.hmd] = curr.count;
      return acc;
    }, {} as PlaysByHmdResponse);
  }
}
