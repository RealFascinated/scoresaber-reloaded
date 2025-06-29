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
export function getValueFromHistory(
  history: FlattenedPlayerHistory,
  field: string
): number | undefined {
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
  statType: string,
  isNegativeChange: boolean,
  daysAgo: number = 1
): number | undefined {
  const todayDate = formatDateMinimal(getMidnightAlignedDate(new Date()));
  const todayStats = history[todayDate];

  // Ensure todayStats exists and contains the statType
  const statToday = todayStats ? getValueFromHistory(todayStats, statType) : undefined;
  if (statToday === undefined) {
    return undefined;
  }

  let otherDate: Date | undefined;
  let statOther: number | undefined;

  // Optimize `daysAgo === 1` case by avoiding unnecessary computations
  if (daysAgo === 1) {
    otherDate = getMidnightAlignedDate(getDaysAgoDate(1)); // Yesterday
    const otherStats = history[formatDateMinimal(otherDate)];
    statOther = otherStats ? getValueFromHistory(otherStats, statType) : undefined;
  } else {
    const targetDate = getDaysAgoDate(daysAgo);

    // Retrieve a list of dates only once, sorted for easier access
    const sortedDates = Object.keys(history).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    // Use binary search to efficiently find the closest date to `targetDate`
    let closestDate: Date | undefined;
    let minDiff = Number.POSITIVE_INFINITY;

    for (const dateKey of sortedDates) {
      const date = new Date(dateKey);
      const diff = Math.abs(date.getTime() - targetDate.getTime());

      // Skip future dates
      if (date.getTime() >= new Date().getTime()) break;

      const statsForDate = history[dateKey];
      if (statType in statsForDate && diff < minDiff) {
        minDiff = diff;
        closestDate = date;
      }
    }

    // If we found a closest valid date, use it
    if (closestDate) {
      otherDate = closestDate;
      const otherStats = history[formatDateMinimal(otherDate)];
      statOther = otherStats ? getValueFromHistory(otherStats, statType) : undefined;
    }
  }

  // Return if no valid `otherStats` or `statOther` was found
  if (statOther === undefined) {
    return 0;
  }

  // Calculate change and apply the `isNegativeChange` modifier
  return (statToday - statOther) * (isNegativeChange ? -1 : 1);
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
