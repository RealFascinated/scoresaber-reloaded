import Player from "../player";
import ScoreSaberPlayerToken from "@/common/model/token/scoresaber/score-saber-player-token";
import { PlayerHistory } from "@/common/player/player-history";
import { config } from "../../../../../config";
import ky from "ky";
import {
  formatDate,
  getDaysAgoDate,
  getMidnightAlignedDate,
} from "@/common/time-utils";

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
  statisticHistory: { [date: string]: PlayerHistory };

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
}

export async function getScoreSaberPlayerFromToken(
  token: ScoreSaberPlayerToken,
): Promise<ScoreSaberPlayer> {
  const bio: ScoreSaberBio = {
    lines: token.bio?.split("\n") || [],
    linesStripped: token.bio?.replace(/<[^>]+>/g, "")?.split("\n") || [],
  };
  const role = token.role == null ? undefined : (token.role as ScoreSaberRole);
  const badges: ScoreSaberBadge[] =
    token.badges?.map((badge) => {
      return {
        url: badge.image,
        description: badge.description,
      };
    }) || [];

  let statisticHistory: { [key: string]: PlayerHistory } = {};
  try {
    const history = await ky
      .get<{
        [key: string]: PlayerHistory;
      }>(`${config.siteUrl}/api/player/history?id=${token.id}`)
      .json();
    if (history === undefined || Object.entries(history).length === 0) {
      console.log("Player has no history, using fallback");
      throw new Error();
    }
    if (history) {
      // Use the latest data for today
      history[formatDate(getMidnightAlignedDate(new Date()))] = {
        rank: token.rank,
        countryRank: token.countryRank,
        pp: token.pp,
      };
    }
    statisticHistory = history;
  } catch (error) {
    // Fallback to ScoreSaber History if the player has no history
    const playerRankHistory = token.histories.split(",").map((value) => {
      return parseInt(value);
    });
    playerRankHistory.push(token.rank);

    let daysAgo = 0; // Start from current day
    for (let i = playerRankHistory.length - 1; i >= 0; i--) {
      const rank = playerRankHistory[i];
      const date = getMidnightAlignedDate(getDaysAgoDate(daysAgo));
      daysAgo += 1; // Increment daysAgo for each earlier rank

      statisticHistory[date.toString()] = {
        rank: rank,
      };
    }

    // Sort the fallback history
    statisticHistory = Object.entries(statisticHistory)
      .sort()
      .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
  }

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
    role: role,
    badges: badges,
    statisticHistory: statisticHistory,
    statistics: token.scoreStats,
    permissions: token.permissions,
    banned: token.banned,
    inactive: token.inactive,
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
