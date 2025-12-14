import { ScoreStatsToken } from "src/types/token/beatleader/score-stats/score-stats";

export type ScoreStatsResponse = {
  /**
   * The current score's scorestats.
   */
  current: ScoreStatsToken;

  /**
   * The previous score's scorestats.
   */
  previous?: ScoreStatsToken;
};