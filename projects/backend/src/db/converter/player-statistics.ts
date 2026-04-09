import { ScoreSaberPlayerStatistics } from "@ssr/common/schemas/scoresaber/player/statistics";
import { PlayerStatisticsRow } from "../schema";


/**
 * Converts a PlayerStatisticsRow to a ScoreSaberPlayerStatistics.
 *
 * @param row the row to convert
 * @returns the converted ScoreSaberPlayerStatistics
 */
export function playerStatisticsRowToType(row: PlayerStatisticsRow): ScoreSaberPlayerStatistics {
  return {
    rank: row.rank,
    countryRank: row.countryRank,
    pp: row.pp,
    plusOnePp: row.plusOnePp,
    totalScore: row.totalScore,
    totalRankedScore: row.totalRankedScore,
    rankedScores: row.rankedScores,
    unrankedScores: row.unrankedScores,
    totalRankedScores: row.totalRankedScores,
    totalUnrankedScores: row.totalUnrankedScores,
    totalScores: row.totalScores,
    replaysWatched: row.replaysWatched,
    averageRankedAccuracy: row.averageRankedAccuracy,
    averageUnrankedAccuracy: row.averageUnrankedAccuracy,
    averageAccuracy: row.averageAccuracy,
    medals: row.medals,
    aPlays: row.aPlays,
    sPlays: row.sPlays,
    spPlays: row.spPlays,
    ssPlays: row.ssPlays,
    sspPlays: row.sspPlays,
    godPlays: row.godPlays,
  } as ScoreSaberPlayerStatistics;
}
