type ScoreHistoryGraphScore = {
  score: number;
  accuracy: number;
  misses: number;
  pp: number;
  timestamp: Date;
};

type ScoreHistoryGraphResponse = {
  scores: ScoreHistoryGraphScore[];
  isRanked: boolean;
};
