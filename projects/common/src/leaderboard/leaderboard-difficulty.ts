import { Difficulty } from "../score/difficulty";

export default interface LeaderboardDifficulty {
  /**
   * The id of the leaderboard.
   */
  leaderboardId: number;

  /**
   * The difficulty of the leaderboard.
   */
  difficulty: Difficulty;

  /**
   * The game mode of the leaderboard.
   */
  gameMode: string;

  /**
   * The raw difficulty of the leaderboard.
   */
  difficultyRaw: string;
}
