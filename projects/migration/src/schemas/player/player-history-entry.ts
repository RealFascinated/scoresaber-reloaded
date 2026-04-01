/**
 * Lean / API shape for a player history snapshot (mirrors Mongo `player-history` document fields).
 * Distinct from the Typegoose `PlayerHistoryEntry` class in `model/player/player-history-entry.ts`.
 */
export interface PlayerHistoryEntryShape {
  _id: string;
  playerId: string;
  date: Date;
  rank?: number;
  countryRank?: number;
  pp?: number;
  plusOnePp?: number;
  totalScore?: number;
  totalRankedScore?: number;
  rankedScores?: number;
  unrankedScores?: number;
  rankedScoresImproved?: number;
  unrankedScoresImproved?: number;
  totalRankedScores?: number;
  totalUnrankedScores?: number;
  totalScores?: number;
  averageRankedAccuracy?: number;
  averageUnrankedAccuracy?: number;
  averageAccuracy?: number;
  medals?: number;
  aPlays?: number;
  sPlays?: number;
  spPlays?: number;
  ssPlays?: number;
  sspPlays?: number;
  godPlays?: number;
}
