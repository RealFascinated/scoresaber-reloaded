import Player from "../player";
import ScoreSaberPlayerToken from "@/common/model/token/scoresaber/score-saber-player-token";

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
  rankHistory: number[];

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

export function getScoreSaberPlayerFromToken(
  token: ScoreSaberPlayerToken,
): ScoreSaberPlayer {
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
  const rankHistory = token.histories.split(",").map((rank) => Number(rank));

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
    rankHistory: rankHistory,
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
