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
   * The amount of scores set for this day.
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
   * The player's accuracy.
   */
  accuracy?: {
    /**
     * The player's average ranked accuracy.
     */
    averageRankedAccuracy?: number;
  };
}
