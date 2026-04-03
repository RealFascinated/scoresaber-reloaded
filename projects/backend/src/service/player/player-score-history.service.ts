import { NotFoundError } from "@ssr/common/error/not-found-error";
import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import Logger, { ScopedLogger } from "@ssr/common/logger";
import type { Page } from "@ssr/common/pagination";
import { Pagination } from "@ssr/common/pagination";
import { ScoreHistoryGraph } from "@ssr/common/schemas/response/score/score-history-graph";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberHistoryScore } from "@ssr/common/schemas/scoresaber/score/history-score";
import { ScoreSaberMedalScore } from "@ssr/common/schemas/scoresaber/score/medal-score";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { scoreHistoryGraphCacheKey } from "../../common/cache-keys";
import { scoreSaberScoreRowToType } from "../../db/converter/scoresaber-score";
import { ScoreSaberScoreHistoryRow } from "../../db/schema";
import { ScoreSaberScoreHistoryRepository } from "../../repositories/scoresaber-score-history.repository";
import CacheService, { CacheId } from "../infra/cache.service";
import { ScoreSaberLeaderboardsService } from "../leaderboard/scoresaber-leaderboards.service";
import { ScoreCoreService } from "../score/score-core.service";

export class PlayerScoreHistoryService {
  private static readonly logger: ScopedLogger = Logger.withTopic("Player Score History");

  /**
   * Reweights the history scores for a leaderboard.
   *
   * @param leaderboard the leaderboard to reweight
   */
  public static async reweightHistoryScoresForLeaderboard(leaderboard: ScoreSaberLeaderboard): Promise<void> {
    PlayerScoreHistoryService.logger.info(
      `Reweighting history scores for leaderboard "${leaderboard.id}"...`
    );

    const rows = await ScoreSaberScoreHistoryRepository.getPpAccuracyByLeaderboardId(leaderboard.id);
    const updates: Partial<ScoreSaberScoreHistoryRow>[] = [];

    for (const row of rows) {
      const newPp = ScoreSaberCurve.getPp(leaderboard.stars, row.accuracy);
      if (row.pp !== newPp) {
        updates.push({ id: row.id, pp: newPp });
      }
    }

    if (updates.length > 0) {
      await ScoreSaberScoreHistoryRepository.bulkUpsetHistoryScores(
        updates.map(u => ({ id: u.id, pp: u.pp }))
      );
      PlayerScoreHistoryService.logger.info(
        `Reweighted ${updates.length} of ${rows.length} history scores for leaderboard "${leaderboard.id}".`
      );
    }
  }

  /**
   * Gets the player's score history for a map.
   *
   * @param playerId the player's id to get the previous scores for
   * @param leaderboardId the leaderboard to get the previous scores on
   * @param page the page to get
   */
  public static async getPlayerScoreHistory(
    playerId: string,
    leaderboardId: number,
    page: number
  ): Promise<Page<ScoreSaberScore>> {
    const leaderboard = await ScoreSaberLeaderboardsService.getLeaderboard(leaderboardId);
    if (!leaderboard) {
      throw new NotFoundError(`Leaderboard "${leaderboardId}" not found`);
    }

    const limit = 8;
    const offset = (page - 1) * limit;

    const total = await ScoreSaberScoreHistoryRepository.countCombinedScoresForPlayerMap(
      playerId,
      leaderboardId
    );

    if (total === 0) {
      throw new NotFoundError(`No previous scores found for ${playerId} in ${leaderboardId}`);
    }

    const pagination = new Pagination<ScoreSaberScore>().setItemsPerPage(limit).setTotalItems(total);

    return pagination.getPage(page, async () => {
      const rawScores = await ScoreSaberScoreHistoryRepository.getCombinedScoresPageForPlayerMap(
        playerId,
        leaderboardId,
        limit,
        offset
      );

      return Promise.all(
        rawScores.map(async row => {
          const scoreRow = scoreSaberScoreRowToType(row);
          const enriched = await ScoreCoreService.insertScoreData(scoreRow, leaderboard, {
            insertPreviousScore: false,
          });
          return enriched;
        })
      );
    });
  }

  /**
   * Gets the player's previous score for a map.
   *
   * @param score the score to get the previous score for
   * @param leaderboard the leaderboard to get the previous score on
   * @param timestamp the timestamp to get the previous score at
   * @returns the previous score
   */
  public static async getPlayerPreviousScore(
    score: ScoreSaberScore | ScoreSaberMedalScore,
    leaderboard: ScoreSaberLeaderboard
  ): Promise<ScoreSaberHistoryScore | undefined> {
    const previousScore = await ScoreSaberScoreHistoryRepository.findLatestRowBeforeTimestamp(
      score.playerId,
      leaderboard.id,
      score.timestamp
    );

    if (!previousScore) {
      return undefined;
    }

    return {
      ...scoreSaberScoreRowToType(previousScore),
      change: {
        score: score.score - previousScore.score,
        accuracy: score.accuracy - previousScore.accuracy,
        misses: score.misses - previousScore.missedNotes - previousScore.badCuts,
        missedNotes: score.missedNotes - previousScore.missedNotes,
        badCuts: score.badCuts - previousScore.badCuts,
        maxCombo: score.maxCombo - previousScore.maxCombo,
        ...("pp" in score ? { pp: score.pp - previousScore.pp } : {}),
      },
    } as ScoreSaberHistoryScore;
  }

  public static async getPlayerScoreHistoryGraph(
    playerId: string,
    leaderboardId: number
  ): Promise<ScoreHistoryGraph> {
    return CacheService.fetch(
      CacheId.SCORESABER_SCORE_HISTORY_GRAPH,
      scoreHistoryGraphCacheKey(playerId, leaderboardId),
      async () => {
        return ScoreSaberScoreHistoryRepository.getAccuracySeriesForPlayerMap(playerId, leaderboardId);
      }
    );
  }
}
