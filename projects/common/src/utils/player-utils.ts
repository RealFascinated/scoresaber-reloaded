import { ScoreSaberPlayerHistory } from "../schemas/scoresaber/player/history";
import { formatDateMinimal, getDaysAgoDate, getMidnightAlignedDate } from "./time-utils";

export function getValueFromHistory(
  history: ScoreSaberPlayerHistory,
  field: keyof ScoreSaberPlayerHistory
): number | undefined | null {
  if (field in history) {
    return history[field];
  }
  return undefined;
}

export function getPlayerStatisticChange(
  history: Record<string, ScoreSaberPlayerHistory>,
  statType: keyof ScoreSaberPlayerHistory,
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

  if (previousStat === undefined) {
    return 0;
  }

  return ((statToday ?? 0) - (previousStat ?? 0)) * (isNegativeChange ? -1 : 1);
}

export function getPlayerStatisticChanges(
  history: Record<string, ScoreSaberPlayerHistory>,
  daysAgo: number = 1
): ScoreSaberPlayerHistory {
  return {
    rank: getPlayerStatisticChange(history, "rank", true, daysAgo),
    countryRank: getPlayerStatisticChange(history, "countryRank", true, daysAgo),
    pp: getPlayerStatisticChange(history, "pp", false, daysAgo),
    medals: getPlayerStatisticChange(history, "medals", false, daysAgo),
  };
}
