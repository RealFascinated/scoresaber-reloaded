export interface PlayerHistory {
  /**
   * The player's rank.
   */
  rank?: number;

  /**
   * The player's country rank.
   */
  countryRank?: number;

  /**
   * The pp of the player.
   */
  pp?: number;

  /**
   * The amount of pp required to gain 1 global pp.
   */
  plusOnePp?: number;

  /**
   * How many times replays of the player scores have been watched
   */
  replaysWatched?: number;

  /**
   * The player's score stats.
   */
  score?: {
    /**
     * The total amount of unranked and ranked score.
     */
    totalScore?: number;

    /**
     * The total amount of ranked score.
     */
    totalRankedScore?: number;
  };

  /**
   * The player's scores stats.
   */
  scores?: {
    /**
     * The amount of score set.
     */
    rankedScores?: number;

    /**
     * The amount of unranked scores set.
     */
    unrankedScores?: number;

    /**
     * The total amount of ranked scores
     */
    totalRankedScores?: number;

    /**
     * The total amount of scores
     */
    totalScores?: number;
  };

  /**
   * The player's accuracy stats.
   */
  accuracy?: {
    /**
     * The player's average ranked accuracy.
     */
    averageRankedAccuracy?: number;

    /**
     * The player's average unranked accuracy.
     */
    averageUnrankedAccuracy?: number;

    /**
     * The player's average accuracy.
     */
    averageAccuracy?: number;
  };
}
