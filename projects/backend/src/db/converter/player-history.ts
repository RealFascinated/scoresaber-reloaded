import { ScoreSaberPlayerHistory } from "@ssr/common/schemas/scoresaber/player/history";
import { PlayerHistoryRow } from "../schema";

function addKey(key: keyof PlayerHistoryRow, value: unknown): Record<string, unknown> {
  if (value === null) {
    return {};
  }
  return {
    [key]: value,
  };
}

/**
 * Converts a PlayerHistoryRow to a ScoreSaberPlayerHistory.
 *
 * @param row the row to convert
 * @returns the converted ScoreSaberPlayerHistory
 */
export function playerHistoryRowToType(row: PlayerHistoryRow): ScoreSaberPlayerHistory {
  return {
    ...addKey("rank", row.rank),
    ...addKey("countryRank", row.countryRank),
    ...addKey("pp", row.pp),
    ...addKey("plusOnePp", row.plusOnePp),
    ...addKey("totalScore", row.totalScore),
    ...addKey("totalRankedScore", row.totalRankedScore),
    ...addKey("rankedScores", row.rankedScores),
    ...addKey("unrankedScores", row.unrankedScores),
    ...addKey("rankedScoresImproved", row.rankedScoresImproved),
    ...addKey("unrankedScoresImproved", row.unrankedScoresImproved),
    ...addKey("totalRankedScores", row.totalRankedScores),
    ...addKey("totalUnrankedScores", row.totalUnrankedScores),
    ...addKey("totalScores", row.totalScores),
    ...addKey("averageRankedAccuracy", row.averageRankedAccuracy),
    ...addKey("averageUnrankedAccuracy", row.averageUnrankedAccuracy),
    ...addKey("averageAccuracy", row.averageAccuracy),
    ...addKey("medals", row.medals),
    ...addKey("aPlays", row.aPlays),
    ...addKey("sPlays", row.sPlays),
    ...addKey("spPlays", row.spPlays),
    ...addKey("ssPlays", row.ssPlays),
    ...addKey("sspPlays", row.sspPlays),
    ...addKey("godPlays", row.godPlays),
  };
}
