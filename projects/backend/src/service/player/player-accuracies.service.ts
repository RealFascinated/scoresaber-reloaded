import { PlayerAccuracies } from "@ssr/common/player/player-accuracies";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../../db";
import { scoreSaberScoresTable } from "../../db/schema";

export class PlayerAccuraciesService {
  /**
   * Gets the player's average accuracies.
   *
   * @param playerId the player's id
   * @returns the player's accuracy
   */
  public static async getPlayerAverageAccuracies(playerId: string): Promise<PlayerAccuracies> {
    const [result] = await db
      .select({
        averageAccuracy: sql<number>`coalesce(avg(${scoreSaberScoresTable.accuracy}), 0)`,
        unrankedAccuracy:
          sql<number>`coalesce(avg(case when ${scoreSaberScoresTable.pp} = 0 then ${scoreSaberScoresTable.accuracy} end), 0)`,
      })
      .from(scoreSaberScoresTable)
      .where(
        and(
          eq(scoreSaberScoresTable.playerId, playerId),
          gte(scoreSaberScoresTable.accuracy, 0),
          lte(scoreSaberScoresTable.accuracy, 100)
        )
      );

    return {
      averageAccuracy: Number(result?.averageAccuracy ?? 0),
      unrankedAccuracy: Number(result?.unrankedAccuracy ?? 0),
    };
  }
}
