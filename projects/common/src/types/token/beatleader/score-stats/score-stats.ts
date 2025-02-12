import { ScoreStatsAccuracyTrackerToken } from "./accuracy-tracker";
import { ScoreStatsHitTrackerToken } from "./hit-tracker";
import { ScoreStatsGraphTrackerToken } from "./score-graph-tracker";
import { ScoreStatsWinTrackerToken } from "./win-tracker";

export type ScoreStatsToken = {
  /**
   * The hit tracker stats.
   */
  hitTracker: ScoreStatsHitTrackerToken;

  /**
   * The accuracy tracker stats.
   */
  accuracyTracker: ScoreStatsAccuracyTrackerToken;

  /**
   * The win tracker stats.
   */
  winTracker: ScoreStatsWinTrackerToken;

  /**
   * The score graph tracker stats.
   */
  scoreGraphTracker: ScoreStatsGraphTrackerToken;
};
