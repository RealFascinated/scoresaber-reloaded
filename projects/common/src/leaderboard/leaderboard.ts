import LeaderboardDifficulty from "./leaderboard-difficulty";

export default interface Leaderboard {
  /**
   * The id of the leaderboard.
   * @private
   */
  readonly id: number;

  /**
   * The hash of the song this leaderboard is for.
   * @private
   */
  readonly songHash: string;

  /**
   * The name of the song this leaderboard is for.
   * @private
   */
  readonly songName: string;

  /**
   * The sub name of the leaderboard.
   * @private
   */
  readonly songSubName: string;

  /**
   * The author of the song this leaderboard is for.
   * @private
   */
  readonly songAuthorName: string;

  /**
   * The author of the level this leaderboard is for.
   * @private
   */
  readonly levelAuthorName: string;

  /**
   * The difficulty of the leaderboard.
   * @private
   */
  readonly difficulty: LeaderboardDifficulty;

  /**
   * The difficulties of the leaderboard.
   * @private
   */
  readonly difficulties: LeaderboardDifficulty[];

  /**
   * The maximum score of the leaderboard.
   * @private
   */
  readonly maxScore: number;

  /**
   * Whether the leaderboard is ranked.
   * @private
   */
  readonly ranked: boolean;

  /**
   * The link to the song art.
   * @private
   */
  readonly songArt: string;

  /**
   * The date the leaderboard was created.
   * @private
   */
  readonly timestamp: Date;
}
