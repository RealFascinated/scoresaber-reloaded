import { HMD } from "@ssr/common/hmds";
import { PlayerModel } from "@ssr/common/model/player/player";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";

export class PlayerHmdService {
  /**
   * Updates the player's HMD.
   *
   * @param playerId the player's id
   * @param hmd the player's HMD
   */
  public static async updatePlayerHmd(playerId: string): Promise<void> {
    const hmds = await this.getPlayerHmdBreakdown(playerId, 10);
    const mostCommonHmd = Object.keys(hmds)[0] ?? undefined;
    if (mostCommonHmd) {
      await PlayerModel.updateOne({ _id: playerId }, { $set: { hmd: mostCommonHmd } });
    }
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
          hmd: { $nin: [null] },
          inactive: false,
        },
      },
      { $group: { _id: "$hmd", count: { $sum: 1 } } },
      { $project: { _id: 0, hmd: "$_id", count: 1 } },
    ]).then(results => Object.fromEntries(results.map(r => [r.hmd, r.count])));

    return hmdUsage;
  }

  /**
   * Gets the player's HMD breakdown.
   *
   * @param playerId the player's id
   * @param limit the limit of scores to get
   * @returns the player's HMD breakdown
   */
  public static async getPlayerHmdBreakdown(
    playerId: string,
    limit?: number
  ): Promise<Record<HMD, number>> {
    const hmds = await ScoreSaberScoreModel.aggregate([
      { $match: { playerId: playerId } }, // get all scores for the player
      { $sort: { timestamp: -1 } }, // sort by timestamp descending
      ...(limit ? [{ $limit: limit }] : []), // get the last x scores
      { $project: { hmd: 1 } }, // select only the hmd field
      { $group: { _id: "$hmd", count: { $sum: 1 } } }, // group by hmd and count the number of scores
      { $sort: { count: -1 } }, // sort by count descending (most common first)
    ]);

    return hmds.reduce(
      (acc, curr) => {
        acc[curr._id as HMD] = curr.count;
        return acc;
      },
      {} as Record<HMD, number>
    );
  }
}
