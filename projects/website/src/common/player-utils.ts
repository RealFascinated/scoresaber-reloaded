import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";

/**
 * Calculates the width of the first column in the player ranking table.
 *
 * @param players the players to calculate the width for
 * @returns the width of the first column
 */
export function getPlayerRankingColumnWidth(
  players: (ScoreSaberPlayer | ScoreSaberPlayerToken)[],
  minWidth = 150
) {
  const maxRank = players?.reduce((max, p) => Math.max(max, p.rank ?? 0), 0) ?? 0;
  const maxCountryRank = players?.reduce((max, p) => Math.max(max, p.countryRank ?? 0), 0) ?? 0;

  // Calculate padding based on number of digits
  const rankDigits = maxRank > 0 ? Math.floor(Math.log10(maxRank)) + 1 : 0;
  const countryRankDigits = maxCountryRank > 0 ? Math.floor(Math.log10(maxCountryRank)) + 1 : 0;

  // Base width + padding for each rank type (20 per digit)
  // Ensure minimum width of 160px for small numbers
  return Math.max(minWidth, 75 + rankDigits * 18 + countryRankDigits * 18);
}

/**
 * Calculates the width of the first column in the friend ranking table.
 *
 * @param players the players to calculate the width for
 * @returns the width of the first column
 */
export function getFriendRankingColumnWidth(
  players: (ScoreSaberPlayer | ScoreSaberPlayerToken)[],
  minWidth = 130
) {
  const maxRank = players?.reduce((max, p) => Math.max(max, p.rank ?? 0), 0) ?? 0;

  // Calculate padding based on number of digits
  const rankDigits = maxRank > 0 ? Math.floor(Math.log10(maxRank)) + 1 : 0;

  // Base width + padding for each rank type (20 per digit)
  // Ensure minimum width of 160px for small numbers
  return Math.max(minWidth, 75 + rankDigits * 15);
}

/**
 * Calculates the width of the first column in the player ranking table.
 *
 * @param players the players to calculate the width for
 * @returns the width of the first column
 */
export function getMedalRankingColumnWidth(players: ScoreSaberPlayer[], minWidth = 120) {
  const maxMedalsRank = players?.reduce((max, p) => Math.max(max, p.medalsRank ?? 0), 0) ?? 0;
  const maxCountryMedalsRank =
    players?.reduce((max, p) => Math.max(max, p.countryMedalsRank ?? 0), 0) ?? 0;

  // Calculate padding based on number of digits
  const medalsRankDigits = maxMedalsRank > 0 ? Math.floor(Math.log10(maxMedalsRank)) + 1 : 0;
  const countryMedalsRankDigits =
    maxCountryMedalsRank > 0 ? Math.floor(Math.log10(maxCountryMedalsRank)) + 1 : 0;

  return Math.max(minWidth, medalsRankDigits * 15 + countryMedalsRankDigits * 15);
}