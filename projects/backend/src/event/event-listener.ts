import { BeatLeaderScoreToken } from "@ssr/common/schemas/beatleader/tokens/score/score";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberLeaderboardPlayerInfo } from "@ssr/common/schemas/scoresaber/leaderboard/player-info";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";

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
    player: ScoreSaberLeaderboardPlayerInfo,
    beatLeaderScore: BeatLeaderScoreToken | undefined,
    isTop50GlobalScore: boolean
  ) => void | Promise<void>;
}
