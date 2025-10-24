export type AppStatistics = {
  /**
   * The total amount of players being tracked.
   */
  trackedPlayers: number;

  /**
   * The total amount of ScoreSaber scores tracked.
   */
  trackedScores: number;

  /**
   * The total amount of score history scores.
   */
  scoreHistoryScores: number;

  /**
   * The total amount of replays stored.
   */
  storedReplays: number;

  /**
   * The total amount of inactive players.
   */
  inactivePlayers: number;

  /**
   * The total amount of active players.
   */
  activePlayers: number;
};
