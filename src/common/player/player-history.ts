export interface PlayerHistory {
  /**
   * An object with the player's statistics
   */
  [key: string]: number | null;

  /**
   * The player's rank.
   */
  rank: number;

  /**
   * The player's country rank.
   */
  countryRank: number;

  /**
   * The pp of the player.
   */
  pp: number;
}
