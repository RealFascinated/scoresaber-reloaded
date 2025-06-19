export type ScoreHistoryGraphScore = {
  score: number;
  accuracy: number;
  misses: number;
  pp: number;
  timestamp: Date;
};

export type ScoreHistoryGraphResponse = {
  scores: ScoreHistoryGraphScore[];
  isRanked: boolean;
};
