import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import { Player, PlayerModel } from "@ssr/common/model/player/player";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { PlayerRankedPpsResponse } from "@ssr/common/response/player-ranked-pps-response";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
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

    const playerScores = await ScoreSaberScoreModel.find({
      playerId: playerId,
      pp: { $gt: 0 },
    })
      .select({
        pp: 1,
        scoreId: 1,
      })
      .lean();

    if (playerScores.length === 0) {
      return {
        scores: [],
      };
    }

    const scores = playerScores.map(score => ({
      pp: score.pp,
      scoreId: score.scoreId,
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
  public static async updatePeakRank(player: Player, playerToken: ScoreSaberPlayerToken) {
    if (playerToken.rank == 0) {
      return player;
    }

    if (!player.peakRank || (player.peakRank && playerToken.rank < player.peakRank.rank)) {
      const newPeakRank = {
        rank: playerToken.rank,
        date: new Date(),
      };

      await PlayerModel.updateOne({ _id: player._id }, { $set: { peakRank: newPeakRank } });

      // Update the local player object
      player.peakRank = newPeakRank;
    }

    return player;
  }

  /**
   * Gets a player's rank including inactive players.
   *
   * @param playerId the id of the player
   * @returns the rank
   */
  public static async getPlayerRankIncludingInactives(playerId: string): Promise<number | null> {
    const player = await PlayerModel.findById(playerId).select("pp").lean();
    if (!player || (player.pp ?? 0) <= 0) return null;

    // Count how many players have more medals than this player
    const rank = await PlayerModel.countDocuments({
      pp: { $gt: player.pp ?? 0 },
    });

    return rank + 1; // +1 because rank is 1-indexed
  }
}
