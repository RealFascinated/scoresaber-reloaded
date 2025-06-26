import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import Logger from "@ssr/common/logger";
import { PlayerModel } from "@ssr/common/model/player/player";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { PlayerRankedPpsResponse } from "@ssr/common/response/player-ranked-pps-response";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { PlayerService } from "./player.service";

export class PlayerRankedService {
  /**
   * Gets the ranked pp scores for a player.
   *
   * @param playerId the player's id
   * @returns the ranked pp scores
   */
  public static async getPlayerRankedPps(playerId: string): Promise<PlayerRankedPpsResponse> {
    await PlayerService.playerExists(playerId, true);

    const playerScores = await PlayerService.getPlayerScores(playerId, {
      sort: {
        field: "pp",
        direction: "desc",
        filters: {
          rankedOnly: true,
        },
      },
      projection: { pp: 1, scoreId: 1 },
      includeLeaderboard: false,
    });

    if (playerScores.length === 0) {
      return {
        scores: [],
      };
    }

    const scores = playerScores.map(score => ({
      pp: score.score.pp,
      scoreId: score.score.scoreId,
    }));

    return {
      scores,
    };
  }

  /**
   * Gets the pp boundary for a player.
   *
   * @param playerId the player's id
   * @param boundary the pp boundary
   */
  public static async getPlayerPpBoundary(
    playerId: string,
    boundary: number = 1
  ): Promise<number[]> {
    // Get the ranked pps list for the player
    const result = await ScoreSaberScoreModel.aggregate([
      {
        $match: {
          playerId: playerId,
          pp: { $gt: 0 },
        },
      },
      {
        $sort: { pp: -1 },
      },
      {
        $group: {
          _id: null,
          pps: { $push: "$pp" },
        },
      },
    ]);

    if (!result.length || !result[0].pps.length) {
      return [0];
    }

    // Calculate all boundaries in a single pass
    const boundaries: number[] = [];
    for (let i = 1; i <= boundary; i++) {
      boundaries.push(ScoreSaberCurve.calcPpBoundary(result[0].pps, i));
    }

    return boundaries;
  }

  /**
   * Gets the pp boundary amount for a pp value.
   *
   * @param playerId the player's id
   * @param boundary the pp boundary
   */
  public static async getPlayerPpBoundaryFromScorePp(
    playerId: string,
    boundary: number = 1
  ): Promise<number> {
    await PlayerService.playerExists(playerId, true);
    const scoresPps = await this.getPlayerRankedPps(playerId);
    if (scoresPps.scores.length === 0) {
      return 0;
    }

    return ScoreSaberCurve.getPpBoundaryForRawPp(
      scoresPps.scores.map(score => score.pp),
      boundary
    );
  }

  /**
   * Updates the player's peak rank.
   *
   * @param playerId the player's id
   * @param playerToken the player's token
   */
  public static async updatePeakRank(playerId: string, playerToken: ScoreSaberPlayerToken) {
    const foundPlayer = await PlayerService.getPlayer(playerId);
    if (playerToken.rank == 0) {
      return foundPlayer;
    }

    if (
      !foundPlayer.peakRank ||
      (foundPlayer.peakRank && playerToken.rank < foundPlayer.peakRank.rank)
    ) {
      const newPeakRank = {
        rank: playerToken.rank,
        date: new Date(),
      };

      await PlayerModel.updateOne({ _id: playerId }, { $set: { peakRank: newPeakRank } });

      // Update the local player object
      foundPlayer.peakRank = newPeakRank;
    }

    return foundPlayer;
  }

  /**
   * Updates the weights of the player's scores using database aggregation
   *
   * @param playerId the player's id
   */
  public static async updatePlayerScoreWeights(playerId: string) {
    const player = await PlayerService.getPlayer(playerId);
    if (!player.seededScores) {
      Logger.info(
        `[PLAYER] Player ${playerId} has not been seeded yet, skipping score weight update...`
      );
      return;
    }

    const before = performance.now();

    // Get sorted scores with minimal data transfer
    const scores = await ScoreSaberScoreModel.aggregate([
      {
        $match: {
          playerId: playerId,
          pp: { $gt: 0 }, // Only consider scores with PP > 0
        },
      },
      {
        $sort: { pp: -1 }, // Sort by PP descending
      },
      {
        $project: { _id: 1, pp: 1 },
      },
    ]);

    if (scores.length === 0) {
      const after = performance.now();
      Logger.info(
        `[PLAYER] No scores found for weight update in ${formatDuration(after - before)} for player ${playerId}`
      );
      return;
    }

    // Calculate weights and create bulk update operations
    const bulkOps = scores.map((score, index) => ({
      updateOne: {
        filter: { _id: score._id },
        update: {
          $set: {
            weight: Math.pow(ScoreSaberCurve.WEIGHT_COEFFICIENT, index),
          },
        },
      },
    }));

    await ScoreSaberScoreModel.bulkWrite(bulkOps);

    const after = performance.now();
    Logger.info(
      `[PLAYER] Score weights updated in ${formatDuration(after - before)} for player ${playerId} (${formatNumberWithCommas(scores.length)} scores)`
    );
  }
}
