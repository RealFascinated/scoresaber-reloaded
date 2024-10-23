import { ScoreStatsHeadPositionToken } from "./head-position";

export type ScoreStatsWinTrackerToken = {
  /**
   * Whether the score was won. (not failed)
   */
  won: boolean;

  /**
   * The time the score ended.
   */
  endTime: number;

  /**
   * The total amount of pauses.
   */
  nbOfPause: number;

  /**
   * The total amount of pause time.
   */
  totalPauseDuration: number;

  /**
   * The jump distance the score was played on.
   */
  jumpDistance: number;

  /**
   * The average height of the player.
   */
  averageHeight: number;

  /**
   * The average head position of the player.
   */
  averageHeadPosition: ScoreStatsHeadPositionToken;

  /**
   * The total score.
   */
  totalScore: number;

  /**
   * The maximum score for this song.
   */
  maxScore: number;
};
