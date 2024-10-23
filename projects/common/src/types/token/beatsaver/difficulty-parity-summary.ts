export type MapDifficultyParitySummaryToken = {
  /**
   * The amount of parity errors.
   */
  errors: number;

  /**
   * The amount of parity warnings.
   */
  warns: number;

  /**
   * The amount of resets in the difficulty.
   */
  resets: number;
};
