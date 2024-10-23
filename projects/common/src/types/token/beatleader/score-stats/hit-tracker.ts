export type ScoreStatsHitTrackerToken = {
  /**
   * The maximum combo achieved.
   */
  maxCombo: number;

  /**
   * The highest amount of 115 notes hit in a row.
   */
  maxStreak: number;

  /**
   * The left hand timing.
   */
  leftTiming: number;

  /**
   * The right hand timing.
   */
  rightTiming: number;

  /**
   * The left hand misses.
   */
  leftMiss: number;

  /**
   * The right hand misses.
   */
  rightMiss: number;

  /**
   * The left hand bad cuts.
   */
  leftBadCuts: number;

  /**
   * The right hand bad cuts.
   */
  rightBadCuts: number;

  /**
   * The left hand bombs.
   */
  leftBombs: number;

  /**
   * The right hand bombs.
   */
  rightBombs: number;
};
