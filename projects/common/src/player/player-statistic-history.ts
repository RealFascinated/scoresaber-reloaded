/**
 * Keep in sync with `PlayerHistoryEntryShape` in `@ssr/migration/schemas/player/player-history-entry`.
 * Inlined here so `@ssr/common` does not depend on `@ssr/migration` (workspace cycle).
 */
interface PlayerHistoryEntryShape {
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

export type FlattenedPlayerHistory = Omit<PlayerHistoryEntryShape, "_id" | "__v" | "playerId" | "date">;
export type PlayerStatisticHistory = Record<string, FlattenedPlayerHistory>;
