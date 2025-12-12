import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";

/**
 * Calculates the width of the first column in the ranking table.
 *
 * @param players the players to calculate the width for
 * @param rank the function to get the rank of a player
 * @param countryRank the function to get the country rank of a player
 * @returns the width of the first column
 */
export function getRankingColumnWidth(
  players: (ScoreSaberPlayer | ScoreSaberPlayerToken)[],
  rank: (player: ScoreSaberPlayer | ScoreSaberPlayerToken) => number,
  countryRank: (player: ScoreSaberPlayer | ScoreSaberPlayerToken) => number
) {
  const maxRank = players?.reduce((max, p) => Math.max(max, rank(p) ?? 0), 0) ?? 0;
  const maxCountryRank = players?.reduce((max, p) => Math.max(max, countryRank(p) ?? 0), 0) ?? 0;
  const rankDigits = maxRank > 0 ? Math.floor(Math.log10(maxRank)) + 1 : 0;
  const countryRankDigits = maxCountryRank > 0 ? Math.floor(Math.log10(maxCountryRank)) + 1 : 0;
  const rankCommas = Math.floor((rankDigits - 1) / 3);
  const countryRankCommas = Math.floor((countryRankDigits - 1) / 3);
  const rankWidth = 35 + (rankDigits + rankCommas + 1) * 7;
  const countryRankWidth = 35 + (countryRankDigits + countryRankCommas + 1) * 7;
  return Math.max(rankWidth, 40) + Math.max(countryRankWidth, 40);
}
