import Player, { StatisticChange } from "../player";
import ky from "ky";
import { PlayerHistory } from "../player-history";
import ScoreSaberPlayerToken from "../../token/scoresaber/score-saber-player-token";
import { formatDateMinimal, getDaysAgoDate, getMidnightAlignedDate } from "../../../utils/time-utils";

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
 * @param apiUrl the api url for SSR
 * @param playerIdCookie the player id cookie (doesn't need to be set)
 */
export async function getScoreSaberPlayerFromToken(
  token: ScoreSaberPlayerToken,
  apiUrl: string,
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
      }>(`${apiUrl}/player/history/${token.id}${playerIdCookie == token.id ? "?createIfMissing=true" : ""}`)
      .json();
    if (history === undefined || Object.entries(history).length === 0) {
      console.log("Player has no history, using fallback");
      throw new Error();
    }
    if (history) {
      // Use the latest data for today
      history[todayDate] = {
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
  } catch (error) {
    // Fallback to ScoreSaber History if the player has no history
    const playerRankHistory = token.histories.split(",").map(value => {
      return parseInt(value);
    });
    playerRankHistory.push(token.rank);

    let daysAgo = 0; // Start from current day
    for (let i = playerRankHistory.length - 1; i >= 0; i--) {
      const rank = playerRankHistory[i];
      const date = getMidnightAlignedDate(getDaysAgoDate(daysAgo));
      daysAgo += 1; // Increment daysAgo for each earlier rank

      statisticHistory[formatDateMinimal(date)] = {
        rank: rank,
      };
    }
  }
  // Sort the fallback history
  statisticHistory = Object.entries(statisticHistory)
    .sort((a, b) => Date.parse(b[0]) - Date.parse(a[0]))
    .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

  const yesterdayDate = formatDateMinimal(getMidnightAlignedDate(getDaysAgoDate(1)));
  const todayStats = statisticHistory[todayDate];
  const yesterdayStats = statisticHistory[yesterdayDate];
  const hasChange = !!(todayStats && yesterdayStats);

  /**
   * Gets the change in the given stat
   *
   * @param statType the stat to check
   * @return the change
   */
  const getChange = (statType: "rank" | "countryRank" | "pp"): number => {
    if (!hasChange) {
      return 0;
    }
    const statToday = todayStats[`${statType}`];
    const statYesterday = yesterdayStats[`${statType}`];
    return !!(statToday && statYesterday) ? statToday - statYesterday : 0;
  };

  // Calculate the changes
  const rankChange = getChange("rank");
  const countryRankChange = getChange("countryRank");
  const ppChange = getChange("pp");

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
      rank: rankChange * -1, // Reverse the rank change
      countryRank: countryRankChange * -1, // Reverse the country rank change
      pp: ppChange,
    },
    role: role,
    badges: badges,
    statisticHistory: statisticHistory,
    statistics: token.scoreStats,
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
