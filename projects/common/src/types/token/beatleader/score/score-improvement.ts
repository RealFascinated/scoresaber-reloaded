export type BeatLeaderScoreImprovementToken = {
  id: number;
  timeset: number;
  score: number;
  accuracy: number;
  pp: number;
  bonusPp: number;
  rank: number;
  accRight: number;
  accLeft: number;
  averageRankedAccuracy: number;
  totalPp: number;
  totalRank: number;
  badCuts: number;
  missedNotes: number;
  bombCuts: number;
  wallsHit: number;
  pauses: number;
};
