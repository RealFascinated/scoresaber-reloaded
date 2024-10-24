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
   * The total amount of additional data for scores being tracked.
   */
  additionalScoresData: number;

  /**
   * The amount of cached BeatSaver maps.
   */
  cachedBeatSaverMaps: number;
};
