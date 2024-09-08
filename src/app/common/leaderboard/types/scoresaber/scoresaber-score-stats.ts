export default interface ScoreSaberScoreStats {
  /**
   * The total amount of score accumulated over all scores.
   */
  totalScore: number;

  /**
   * The total amount of ranked score accumulated over all scores.
   */
  totalRankedScore: number;

  /**
   * The average ranked accuracy for all ranked scores.
   */
  averageRankedAccuracy: number;

  /**
   * The total amount of scores set.
   */
  totalPlayCount: number;

  /**
   * The total amount of ranked score set.
   */
  rankedPlayCount: number;

  /**
   * The amount of times their replays were watched.
   */
  replaysWatched: number;
}
