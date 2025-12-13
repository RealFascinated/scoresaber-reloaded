import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { BeatLeaderScoreToken } from "@ssr/common/types/token/beatleader/score/score";
import { ScoreSaberLeaderboardPlayerInfoToken } from "@ssr/common/types/token/scoresaber/leaderboard-player-info";

export interface EventListener {
  /**
   * Called when the application starts.
   */
  onStart?: () => void;

  /**
   * Called when the application stops.
   */
  onStop?: () => Promise<void>;

  /**
   * Called when a score is received.
   *
   * @param score the ScoreSaber score that was received.
   * @param leaderboard the leaderboard for the score.
   * @param player the player for the score.
   * @param beatLeaderScore the BeatLeader score that was received, if any.
   * @param isTop50GlobalScore whether the score is in the top 50 global scores.
   */
  onScoreReceived?: (
    score: ScoreSaberScore,
    leaderboard: ScoreSaberLeaderboard,
    player: ScoreSaberLeaderboardPlayerInfoToken,
    beatLeaderScore: BeatLeaderScoreToken | undefined,
    isTop50GlobalScore: boolean
  ) => void;
}
