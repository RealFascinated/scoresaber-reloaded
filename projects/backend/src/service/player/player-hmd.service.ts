import { PlayerModel } from "@ssr/common/model/player/player";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";

export class PlayerHmdService {
  /**
   * Updates the player's HMD.
   *
   * @param playerId the player's id
   * @param hmd the player's HMD
   */
  public static async updatePlayerHmd(playerId: string, hmd: string): Promise<void> {
    await PlayerModel.updateOne({ _id: playerId }, { $set: { hmd } });
  }

  /**
   * Gets the hmd usage from the current day.
   *
   * @returns the hmd usage
   */
  public static async getActiveHmdUsage(): Promise<Record<string, number>> {
    const hmdUsage = await PlayerModel.aggregate([
      {
        $match: {
          hmd: { $nin: ["Unknown", null] },
          inactive: false,
        },
      },
      { $group: { _id: "$hmd", count: { $sum: 1 } } },
      { $project: { _id: 0, hmd: "$_id", count: 1 } },
    ]).then(results => Object.fromEntries(results.map(r => [r.hmd, r.count])));

    return hmdUsage;
  }

  /**
   * Gets the player's most common recent HMD.
   *
   * @param playerId the player's id
   * @returns the player's most common recent HMD
   */
  public static async getPlayerMostCommonRecentHmd(playerId: string): Promise<string | undefined> {
    const hmds = await ScoreSaberScoreModel.aggregate([
      { $match: { playerId: playerId } }, // get all scores for the player
      { $sort: { timestamp: -1 } }, // sort by timestamp descending
      { $match: { hmd: { $ne: "Unknown" } } }, // filter out scores with unknown hmd
      { $limit: 50 }, // get the last 50 scores
      { $group: { _id: "$hmd", count: { $sum: 1 } } }, // group by hmd and count the number of scores
      { $sort: { count: -1 } }, // sort by count descending (most common first)
      { $limit: 1 }, // get the most common hmd
    ]);

    return hmds[0]?._id ?? undefined;
  }
}
