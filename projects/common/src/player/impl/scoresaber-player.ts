import { AccBadges } from "../acc-badges";
import { PeakRank } from "../peak-rank";
import Player, { StatisticChange } from "../player";

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
  role: string | undefined;

  /**
   * The badges the player has.
   */
  badges: ScoreSaberBadge[];

  /**
   * The statistics for this player.
   */
  statistics: ScoreSaberPlayerStatistics;

  /**
   * The best rank seen for this player.
   */
  peakRank?: PeakRank;

  /**
   * The permissions the player has.
   */
  permissions: number;

  /**
   * The pages for the players positions.
   */
  rankPages: ScoreSaberRankPages;

  /**
   * The amount of pp boundaries the player has.
   */
  ppBoundaries: number[];

  /**
   * The acc badges based on the player's scores.
   */
  accBadges: AccBadges;

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
