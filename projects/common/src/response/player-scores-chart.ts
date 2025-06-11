export type PlayerScoresChartResponse = {
  /**
   * The player's score chart data
   */
  data: PlayerScoreChartDataPoint[];
};

export type PlayerScoreChartDataPoint = {
  /**
   * The accuracy for this score
   */
  accuracy: number;

  /**
   * The stars for this score
   */
  stars: number;

  /**
   * The pp for this score
   */
  pp: number;

  /**
   * The leaderboard id for this score
   */
  leaderboardId: string;

  /**
   * The leaderboard name for this score
   */
  leaderboardName: string;

  /**
   * The leaderboard difficulty for this score
   */
  leaderboardDifficulty: string;
};
