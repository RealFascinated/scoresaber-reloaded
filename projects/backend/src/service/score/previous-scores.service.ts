import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import {
  ScoreSaberPreviousScoreDocument,
  ScoreSaberPreviousScoreModel,
} from "@ssr/common/model/score/impl/scoresaber-previous-score";
import {
  ScoreSaberPreviousScoreOverview,
  ScoreSaberScore,
} from "@ssr/common/model/score/impl/scoresaber-score";

export class PreviousScoresService {
  /**
   * Gets the player's previous score for a map.
   *
   * @param playerId the player's id to get the previous score for
   * @param score the score to get the previous score for
   * @param leaderboard the leaderboard to get the previous score on
   * @param timestamp the score's timestamp to get the previous score for
   * @returns the score, or undefined if none
   */
  public static async getPreviousScore(
    playerId: string,
    score: ScoreSaberScore,
    leaderboard: ScoreSaberLeaderboard,
    timestamp: Date
  ): Promise<ScoreSaberPreviousScoreOverview | undefined> {
    const scores: ScoreSaberPreviousScoreDocument[] = await ScoreSaberPreviousScoreModel.find({
      playerId: playerId,
      leaderboardId: leaderboard.id,
    }).sort({
      timestamp: -1,
    });
    if (scores == null || scores.length == 0) {
      return undefined;
    }

    // get first score before timestamp
    const previousScore = scores.find(score => score.timestamp.getTime() < timestamp.getTime());
    if (previousScore == undefined) {
      return undefined;
    }

    return {
      score: previousScore.score,
      accuracy: previousScore.accuracy || (score.score / leaderboard.maxScore) * 100,
      modifiers: previousScore.modifiers,
      misses: previousScore.misses,
      missedNotes: previousScore.missedNotes,
      badCuts: previousScore.badCuts,
      fullCombo: previousScore.fullCombo,
      pp: previousScore.pp,
      weight: previousScore.weight,
      maxCombo: previousScore.maxCombo,
      timestamp: previousScore.timestamp,
      change: {
        score: score.score - previousScore.score,
        accuracy:
          (score.accuracy || (score.score / leaderboard.maxScore) * 100) -
          (previousScore.accuracy || (previousScore.score / leaderboard.maxScore) * 100),
        misses: score.misses - previousScore.misses,
        missedNotes: score.missedNotes - previousScore.missedNotes,
        badCuts: score.badCuts - previousScore.badCuts,
        pp: score.pp - previousScore.pp,
        weight: score.weight && previousScore.weight && score.weight - previousScore.weight,
        maxCombo: score.maxCombo - previousScore.maxCombo,
      },
    } as ScoreSaberPreviousScoreOverview;
  }
}
