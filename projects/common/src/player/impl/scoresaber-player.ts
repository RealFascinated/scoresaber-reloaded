import Player, { StatisticChange } from "../player";
import ky from "ky";
import { PlayerHistory } from "../player-history";
import ScoreSaberPlayerToken from "../../types/token/scoresaber/score-saber-player-token";
import { formatDateMinimal, getDaysAgoDate, getMidnightAlignedDate } from "../../utils/time-utils";
import { getPageFromRank } from "../../utils/utils";
import { Config } from "../../config";
import { getValueFromHistory } from "../../utils/player-utils";

/**
 * A ScoreSaber player.
 */
export default interface ScoreSaberPlayer extends Player {
  /**
   * The bio of the player.
   */
  bio: ScoreSaberBio;

  /**
   * The amount of pp the player has.
   */
  pp: number;

  /**
   * The change in pp compared to yesterday.
   */
  statisticChange: StatisticChange | undefined;

  /**
   * The role the player has.
   */
  role: ScoreSaberRole | undefined;

  /**
   * The badges the player has.
   */
  badges: ScoreSaberBadge[];

  /**
   * The rank history for this player.
   */
  statisticHistory: { [key: string]: PlayerHistory };

  /**
   * The statistics for this player.
   */
  statistics: ScoreSaberPlayerStatistics;

  /**
   * The permissions the player has.
   */
  permissions: number;

  /**
   * The pages for the players positions.
   */
  rankPages: ScoreSaberRankPages;

  /**
   * Whether the player is banned or not.
   */
  banned: boolean;

  /**
   * Whether the player is inactive or not.
   */
  inactive: boolean;

  /**
   * Whether the player is having their
   * statistics being tracked or not.
   */
  isBeingTracked?: boolean;
}

/**
 * Gets the ScoreSaber Player from an {@link ScoreSaberPlayerToken}.
 *
 * @param token the player token
 * @param playerIdCookie the id of the claimed player
 */
export async function getScoreSaberPlayerFromToken(
  token: ScoreSaberPlayerToken,
  playerIdCookie?: string
): Promise<ScoreSaberPlayer> {
  const bio: ScoreSaberBio = {
    lines: token.bio?.split("\n") || [],
    linesStripped: token.bio?.replace(/<[^>]+>/g, "")?.split("\n") || [],
  };
  const role = token.role == null ? undefined : (token.role as ScoreSaberRole);
  const badges: ScoreSaberBadge[] =
    token.badges?.map(badge => {
      return {
        url: badge.image,
        description: badge.description,
      };
    }) || [];

  let isBeingTracked = false;
  const todayDate = formatDateMinimal(getMidnightAlignedDate(new Date()));
  let statisticHistory: { [key: string]: PlayerHistory } = {};

  try {
    const { statistics: history } = await ky
      .get<{
        statistics: { [key: string]: PlayerHistory };
      }>(
        `${Config.apiUrl}/player/history/${token.id}${playerIdCookie && playerIdCookie == token.id ? "?createIfMissing=true" : ""}`
      )
      .json();
    if (history) {
      // Use the latest data for today
      history[todayDate] = {
        ...{
          scores: {
            rankedScores: 0,
            unrankedScores: 0,
            totalScores: 0,
            totalRankedScores: 0,
          },
        },
        ...history[todayDate],
        rank: token.rank,
        countryRank: token.countryRank,
        pp: token.pp,
        accuracy: {
          averageRankedAccuracy: token.scoreStats.averageRankedAccuracy,
        },
      };

      isBeingTracked = true;
    }
    statisticHistory = history;
  } catch (e) {}

  const playerRankHistory = token.histories.split(",").map(value => {
    return parseInt(value);
  });
  playerRankHistory.push(token.rank);

  let missingDays = 0;
  let daysAgo = 0; // Start from current day
  for (let i = playerRankHistory.length - 1; i >= 0; i--) {
    const rank = playerRankHistory[i];
    if (rank == 999_999) {
      continue;
    }

    const date = getMidnightAlignedDate(getDaysAgoDate(daysAgo));
    daysAgo += 1;

    const dateKey = formatDateMinimal(date);
    if (!statisticHistory[dateKey] || statisticHistory[dateKey].rank == undefined) {
      missingDays += 1;
      statisticHistory[dateKey] = {
        ...statisticHistory[dateKey],
        rank: rank,
        scores: {
          totalScores: token.scoreStats.totalPlayCount,
          totalRankedScores: token.scoreStats.rankedPlayCount,
        },
      };
    }
  }

  if (missingDays > 0 && missingDays != playerRankHistory.length) {
    console.log(
      `Player has ${missingDays} missing day${missingDays > 1 ? "s" : ""}, filling in with fallback history...`
    );
  }

  // Sort the fallback history
  statisticHistory = Object.entries(statisticHistory)
    .sort((a, b) => Date.parse(b[0]) - Date.parse(a[0]))
    .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

  /**
   * Gets the change in the given stat
   *
   * @param statType the stat to check
   * @param daysAgo the amount of days ago to get the stat for
   * @return the change
   */
  const getStatisticChange = (statType: string, daysAgo: number = 1): number | undefined => {
    const todayStats = statisticHistory[todayDate];
    let otherDate: Date | undefined;

    // Use the same logic as the first version to get the date exactly 'daysAgo' days earlier
    if (daysAgo === 1) {
      otherDate = getMidnightAlignedDate(getDaysAgoDate(1)); // Yesterday
    } else {
      const targetDate = getDaysAgoDate(daysAgo);

      // Filter available dates to find the closest one to the target
      const availableDates = Object.keys(statisticHistory)
        .map(dateKey => new Date(dateKey))
        .filter(date => {
          // Convert date back to the correct format for statisticHistory lookup
          const formattedDate = formatDateMinimal(date);
          const statsForDate = statisticHistory[formattedDate];
          const hasStat = statsForDate && statType in statsForDate;

          // Only consider past dates with the required statType
          const isPast = date.getTime() < new Date().getTime();
          return hasStat && isPast;
        });

      // If no valid dates are found, return undefined
      if (availableDates.length === 0) {
        return undefined;
      }

      // Find the closest date from the filtered available dates
      otherDate = availableDates.reduce((closestDate, currentDate) => {
        const currentDiff = Math.abs(currentDate.getTime() - targetDate.getTime());
        const closestDiff = Math.abs(closestDate.getTime() - targetDate.getTime());
        return currentDiff < closestDiff ? currentDate : closestDate;
      }, availableDates[0]); // Start with the first available date
    }

    // Ensure todayStats exists and contains the statType
    if (!todayStats || !(statType in todayStats)) {
      return undefined;
    }

    const otherStats = statisticHistory[formatDateMinimal(otherDate)]; // This is now validated

    // Ensure otherStats exists and contains the statType
    if (!otherStats || !(statType in otherStats)) {
      return undefined;
    }

    const statToday = getValueFromHistory(todayStats, statType);
    const statOther = getValueFromHistory(otherStats, statType);

    if (statToday === undefined || statOther === undefined) {
      return undefined;
    }

    // Return the difference, accounting for negative changes in ranks
    return (statToday - statOther) * (statType === "pp" ? 1 : -1);
  };

  const getStatisticChanges = (daysAgo: number): PlayerHistory => {
    return {
      rank: getStatisticChange("rank", daysAgo),
      countryRank: getStatisticChange("countryRank", daysAgo),
      pp: getStatisticChange("pp", daysAgo),
      scores: {
        totalScores: getStatisticChange("scores.totalScores", daysAgo),
        totalRankedScores: getStatisticChange("scores.totalRankedScores", daysAgo),
      },
    };
  };

  return {
    id: token.id,
    name: token.name,
    avatar: token.profilePicture,
    country: token.country,
    rank: token.rank,
    countryRank: token.countryRank,
    joinedDate: new Date(token.firstSeen),
    bio: bio,
    pp: token.pp,
    statisticChange: {
      daily: getStatisticChanges(1),
      weekly: getStatisticChanges(7),
      monthly: getStatisticChanges(30),
      yearly: getStatisticChanges(365),
    },
    role: role,
    badges: badges,
    statisticHistory: statisticHistory,
    statistics: token.scoreStats,
    rankPages: {
      global: getPageFromRank(token.rank, 50),
      country: getPageFromRank(token.countryRank, 50),
    },
    permissions: token.permissions,
    banned: token.banned,
    inactive: token.inactive,
    isBeingTracked: isBeingTracked,
  };
}

/**
 * A bio of a player.
 */
export type ScoreSaberBio = {
  /**
   * The lines of the bio including any html tags.
   */
  lines: string[];

  /**
   * The lines of the bio stripped of all html tags.
   */
  linesStripped: string[];
};

/**
 * The ScoreSaber account roles.
 */
export type ScoreSaberRole = "Admin";

/**
 * A badge for a player.
 */
export type ScoreSaberBadge = {
  /**
   * The URL to the badge.
   */
  url: string;

  /**
   * The description of the badge.
   */
  description: string;
};

/**
 * The statistics for a player.
 */
export type ScoreSaberPlayerStatistics = {
  /**
   * The total amount of score accumulated over all scores.
   */
  totalScore: number;

  /**
   * The total amount of ranked score accumulated over all scores.
   */
  totalRankedScore: number;

  /**
   * The average ranked accuracy for all ranked scores.
   */
  averageRankedAccuracy: number;

  /**
   * The total amount of scores set.
   */
  totalPlayCount: number;

  /**
   * The total amount of ranked score set.
   */
  rankedPlayCount: number;

  /**
   * The amount of times their replays were watched.
   */
  replaysWatched: number;
};

export type ScoreSaberRankPages = {
  /**
   * Their page for their global rank position.
   */
  global: number;

  /**
   * Their page for their country rank position.
   */
  country: number;
};
