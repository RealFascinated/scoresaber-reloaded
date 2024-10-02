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
   * The player's accuracy.
   */
  accuracy?: {
    /**
     * The player's average ranked accuracy.
     */
    averageRankedAccuracy?: number;
  };
}
