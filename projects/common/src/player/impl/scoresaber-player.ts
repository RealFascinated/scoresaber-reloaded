import { HMD } from "../../hmds";
import { ScoreSaberPeakRank } from "../../schemas/scoresaber/player/peak-rank";
import { ScoreSaberPlayerStatistics } from "../../schemas/scoresaber/player/statistics";
import Player, { StatisticChange } from "../player";

/**
 * A ScoreSaber player.
 */
export default interface ScoreSaberPlayer extends ScoreSaberPlayerBase {
  /**
   * The change in pp compared to yesterday.
   */
  statisticChange: StatisticChange | undefined;

  /**
   * The statistics for this player.
   */
  statistics: ScoreSaberPlayerStatistics;

  /**
   * The best rank seen for this player.
   */
  peakRank?: ScoreSaberPeakRank;

  /**
   * The pages for the players positions.
   */
  rankPages: ScoreSaberRankPages;

  /**
   * The amount of raw pp needed to gain 1 weighted pp.
   */
  plusOnePp: number;

  /**
   * The date the player was first tracked.
   */
  trackedSince: Date;

  /**
   * The amount of global medals the player has.
   */
  medals: number;

  /**
   * The player's medal rank.
   */
  medalsRank: number;

  /**
   * The player's country medal rank.
   */
  medalsCountryRank: number;

  /**
   * The player's hmd breakdown.
   * HMD -> Percentage
   */
  hmdBreakdown: Record<HMD, number> | undefined;

  /**
   * The player's rank percentile (top 0.1%)
   */
  rankPercentile: number;

  /**
   * The player's current streak.
   */
  currentStreak: number;

  /**
   * The player's longest streak.
   */
  longestStreak: number;
}

export interface ScoreSaberPlayerBase extends Player {
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
  role: string | undefined;

  /**
   * The badges the player has.
   */
  badges: ScoreSaberBadge[];

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

export type ScoreSaberRankPages = {
  /**
   * Their page for their global rank position.
   */
  global: number;

  /**
   * Their page for their country rank position.
   */
  country: number;

  /**
   * Their page for their medal rank position.
   */
  medals?: number;
};
