import { FlattenedPlayerHistory } from "../player/player-statistic-history";
import { ScoreSaberPlayerToken } from "../types/token/scoresaber/player";
import { formatDateMinimal, getDaysAgoDate, getMidnightAlignedDate } from "./time-utils";

/**
 * Gets a value from an {@link FlattenedPlayerHistory}
 * based on the field
 *
 * @param history the history to get the value from
 * @param field the field to get
 */
export function getValueFromHistory(history: FlattenedPlayerHistory, field: string): number | undefined {
  if (field in history) {
    return history[field as keyof FlattenedPlayerHistory];
  }
  return undefined;
}

/**
 * Gets the statistic change of a player
 *
 * @param history the player's history
 * @param statType the statistic type
 * @param isNegativeChange whether the change should be negative
 * @param daysAgo the amount of days to look back
 * @returns the statistic change
 * @private
 */
export function getPlayerStatisticChange(
  history: Record<string, FlattenedPlayerHistory>,
  statType: keyof FlattenedPlayerHistory,
  isNegativeChange: boolean,
  daysAgo: number = 1
): number | undefined {
  const today = formatDateMinimal(getMidnightAlignedDate(new Date()));
  const todayStats = history[today];

  const statToday = todayStats ? getValueFromHistory(todayStats, statType) : undefined;
  if (statToday === undefined) {
    return undefined;
  }

  const previousDate = getMidnightAlignedDate(getDaysAgoDate(daysAgo));
  const previousDateKey = formatDateMinimal(previousDate);
  const previousStats = history[previousDateKey];
  const previousStat = previousStats ? getValueFromHistory(previousStats, statType) : undefined;

  // No previous stats found
  if (previousStat === undefined) {
    return 0;
  }

  return (statToday - previousStat) * (isNegativeChange ? -1 : 1);
}

/**
 * Gets the changes in the players statistic history
 *
 * @param history the player's history
 * @param daysAgo the amount of days to look back
 * @returns the statistic changes
 * @private
 */
export async function getPlayerStatisticChanges(
  history: Record<string, FlattenedPlayerHistory>,
  daysAgo: number = 1
): Promise<FlattenedPlayerHistory> {
  return {
    rank: getPlayerStatisticChange(history, "rank", true, daysAgo),
    countryRank: getPlayerStatisticChange(history, "countryRank", true, daysAgo),
    pp: getPlayerStatisticChange(history, "pp", false, daysAgo),
    medals: getPlayerStatisticChange(history, "medals", false, daysAgo),
  };
}

/**
 * Parses a player's rank history from their ScoreSaber token.
 *
 * @param playerToken - The ScoreSaber player token
 * @returns Array of rank numbers
 */
export function parseRankHistory(playerToken: ScoreSaberPlayerToken): number[] {
  return [...playerToken.histories.split(",").map(Number), playerToken.rank];
}
