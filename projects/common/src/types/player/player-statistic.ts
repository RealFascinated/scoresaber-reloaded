export interface PlayerStatistic {
  rank?: number;
  pp?: number;
  plusOnePp?: number;
  countryRank?: number;
  replaysWatched?: number;
  accuracy?: {
    averageRankedAccuracy?: number;
    averageUnrankedAccuracy?: number;
    averageAccuracy?: number;
  };
  scores?: {
    rankedScores?: number;
    unrankedScores?: number;
    totalScores?: number;
    totalRankedScores?: number;
  };
  score?: {
    totalScore?: number;
    totalRankedScore?: number;
  };
}

export interface ScoreCalendarData {
  days: Record<number, { rankedMaps: number; unrankedMaps: number; totalMaps: number }>;
  metadata: Record<number, number[]>;
}
