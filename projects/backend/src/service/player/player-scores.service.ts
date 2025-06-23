import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { CooldownPriority } from "@ssr/common/cooldown";
import Logger from "@ssr/common/logger";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { Player, PlayerModel } from "@ssr/common/model/player";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { PlayerScoresChartResponse } from "@ssr/common/response/player-scores-chart";
import {
  getScoreSaberLeaderboardFromToken,
  getScoreSaberScoreFromToken,
} from "@ssr/common/token-creators";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { ScoreService } from "../score.service";

type PlayerRefreshResult = {
  missingScores: number;
  totalScores: number;
  totalPages: number;
  timeTaken: number;
};

export class PlayerScoresService {
  /**
   * Refreshes all scores for a player.
   *
   * @param player the player to refresh scores for
   * @param playerToken the player's token
   * @returns the result of the refresh
   */
  public static async refreshAllPlayerScores(
    player: Player,
    playerToken: ScoreSaberPlayerToken
  ): Promise<PlayerRefreshResult> {
    Logger.info(`Refreshing scores for ${player._id}...`);
    const startTime = performance.now();

    const result: PlayerRefreshResult = {
      missingScores: 0,
      totalScores: 0,
      totalPages: 0,
      timeTaken: 0,
    };

    // First, get the first page to determine total pages
    const firstPage = await ApiServiceRegistry.getInstance()
      .getScoreSaberService()
      .lookupPlayerScores({
        playerId: player._id,
        page: 1,
        limit: 100,
        sort: "recent",
        priority: CooldownPriority.BACKGROUND,
      });

    if (!firstPage) {
      Logger.info(`No scores found for player ${player._id}`);

      // Mark player as seeded
      if (!player.seededScores) {
        await PlayerModel.updateOne({ _id: player._id }, { $set: { seededScores: true } });
      }

      result.timeTaken = performance.now() - startTime;
      return result;
    }

    const totalPages = Math.ceil(firstPage.metadata.total / 100);
    Logger.info(`Found ${totalPages} total pages for ${player._id}`);

    // Process the first page
    for (const score of firstPage.playerScores) {
      const leaderboard = getScoreSaberLeaderboardFromToken(score.leaderboard);

      const { tracked } = await ScoreService.trackScoreSaberScore(
        getScoreSaberScoreFromToken(score.score, leaderboard, player._id),
        leaderboard,
        playerToken,
        true,
        false
      );
      if (tracked) {
        result.missingScores++;
      }
      result.totalScores++;
    }

    // Process remaining pages
    for (let page = 2; page <= totalPages; page++) {
      Logger.info(`Processing page ${page} for ${player._id}...`);

      const scoresPage = await ApiServiceRegistry.getInstance()
        .getScoreSaberService()
        .lookupPlayerScores({
          playerId: player._id,
          page: page,
          limit: 100,
          sort: "recent",
          priority: CooldownPriority.BACKGROUND,
        });

      if (!scoresPage) {
        Logger.warn(`Failed to fetch scores for ${player._id} on page ${page}.`);
        continue;
      }

      for (const score of scoresPage.playerScores) {
        const leaderboard = getScoreSaberLeaderboardFromToken(score.leaderboard);
        const { tracked } = await ScoreService.trackScoreSaberScore(
          getScoreSaberScoreFromToken(score.score, leaderboard, player._id),
          leaderboard,
          playerToken,
          true,
          false
        );
        if (tracked) {
          result.missingScores++;
        }
        result.totalScores++;
      }

      Logger.info(`Completed page ${page} for ${player._id}`);
    }

    // Mark player as seeded
    if (!player.seededScores) {
      await PlayerModel.updateOne({ _id: player._id }, { $set: { seededScores: true } });
    }

    result.totalPages = totalPages;
    result.timeTaken = performance.now() - startTime;
    Logger.info(
      `Finished refreshing scores for ${player._id}, total pages refreshed: ${totalPages} in ${formatDuration(result.timeTaken)}`
    );
    return result;
  }

  /**
   * Gets the player's score chart data.
   *
   * @param playerId the player's id
   */
  public static async getPlayerScoreChart(playerId: string): Promise<PlayerScoresChartResponse> {
    const playerScores = await ScoreService.getPlayerScores(playerId, {
      includeLeaderboard: true,
      ranked: true,
      projection: {
        accuracy: 1,
        pp: 1,
        timestamp: 1,
      },
    });

    // Process data points in parallel using Promise.all
    const data = await Promise.all(
      playerScores.map(async playerScore => {
        const leaderboard = playerScore.leaderboard as ScoreSaberLeaderboard;
        const score = playerScore.score as ScoreSaberScore;

        return {
          accuracy: score.accuracy,
          stars: leaderboard.stars,
          pp: score.pp,
          timestamp: score.timestamp,
          leaderboardId: leaderboard.id + "",
          leaderboardName: leaderboard.fullName,
          leaderboardDifficulty: getDifficultyName(
            getDifficulty(leaderboard.difficulty.difficulty)
          ),
        };
      })
    );

    return {
      data,
    };
  }
}
