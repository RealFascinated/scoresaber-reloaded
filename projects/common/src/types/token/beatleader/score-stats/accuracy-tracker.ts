export type ScoreStatsAccuracyTrackerToken = {
  /**
   * The accuracy of the right hand.
   */
  accRight: number;

  /**
   * The accuracy of the left hand.
   */
  accLeft: number;

  /**
   * The left hand pre-swing.
   */
  leftPreswing: number;

  /**
   * The right hand pre-swing.
   */
  rightPreswing: number;

  /**
   * The average pre-swing.
   */
  averagePreswing: number;

  /**
   * The left hand post-swing.
   */
  leftPostswing: number;

  /**
   * The right hand post-swing.
   */
  rightPostswing: number;

  /**
   * The left hand time dependence.
   */
  leftTimeDependence: number;

  /**
   * The right hand time dependence.
   */
  rightTimeDependence: number;

  /**
   * The left hand average cut.
   */
  leftAverageCut: number[];

  /**
   * The right hand average cut.
   */
  rightAverageCut: number[];

  /**
   * The grid accuracy.
   */
  gridAcc: number[];

  /**
   * The full combo accuracy.
   */
  fcAcc: number;
};
