import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import { PlayerPpsResponse } from "@ssr/common/schemas/response/player/player-pps";
import { updateScoreWeights } from "@ssr/common/utils/scoresaber.util";
import { and, desc, eq, gt } from "drizzle-orm";
import { db } from "../../db";
import { scoreSaberScoresTable } from "../../db/schema";
import { PlayerCoreService } from "./player-core.service";

export class PlayerRankedService {
  /**
   * Gets the ranked pp scores for a player.
   *
   * @param playerId the player's id
   * @returns the ranked pp scores
   */
  public static async getPlayerPps(playerId: string): Promise<PlayerPpsResponse> {
    await PlayerCoreService.playerExists(playerId, true);

    const playerScores = await db
      .select({
        pp: scoreSaberScoresTable.pp,
        scoreId: scoreSaberScoresTable.id,
      })
      .from(scoreSaberScoresTable)
      .where(and(eq(scoreSaberScoresTable.playerId, playerId), gt(scoreSaberScoresTable.pp, 0)))
      .orderBy(desc(scoreSaberScoresTable.pp));

    if (playerScores.length === 0) {
      return {
        scores: [],
      };
    }

    const scores = playerScores.map(score => ({
      pp: score.pp,
      scoreId: score.scoreId,
      weight: 0,
    }));

    updateScoreWeights(scores); // Set the weights for the scores
    return {
      scores,
    };
  }

  /**
   * Gets the raw pp needed to gain 1 weighted pp for a player.
   *
   * @param playerId the player's id
   * @returns the raw pp needed to gain 1 weighted pp
   */
  public static async getPlayerWeightedPpGainForRawPp(playerId: string): Promise<number> {
    const playerScores = await db
      .select({ pp: scoreSaberScoresTable.pp })
      .from(scoreSaberScoresTable)
      .where(and(eq(scoreSaberScoresTable.playerId, playerId), gt(scoreSaberScoresTable.pp, 0)))
      .orderBy(desc(scoreSaberScoresTable.pp));

    // No ranked score set
    if (playerScores.length === 0) {
      return 0;
    }
    return ScoreSaberCurve.calcRawPpForExpectedPp(
      playerScores.map(score => score.pp),
      1
    );
  }
}
