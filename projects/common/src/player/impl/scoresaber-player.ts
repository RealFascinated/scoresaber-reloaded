import type { HMD } from "../../schemas/hmd";
import { ScoreSaberPeakRank } from "../../schemas/scoresaber/player/peak-rank";
import { ScoreSaberPlayerStatistics } from "../../schemas/scoresaber/player/statistics";
import Player, { StatisticChange } from "../player";

export default interface ScoreSaberPlayer extends ScoreSaberPlayerBase {
  /**
   * The contextual rank for this player
   */
  contextualRank?: number;

  /**
   * The contextual country rank for this player
   */
  contextualCountryRank?: number;

  /**
   * The change in pp compared to yesterday.
   */
  statisticChange: StatisticChange | undefined;

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
   * The highest pp the player has on a single score.
   */
  topPp?: number;

  /**
   * The date the player was first tracked.
   */
  trackedSince: Date;

  medals: number;

  medalsRank: number;

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

  currentStreak: number;

  longestStreak: number;
}

export interface ScoreSaberPlayerBase extends Player {
  pp: number;

  role: string | undefined;

  badges: ScoreSaberBadge[];

  permissions: number;

  banned: boolean;

  inactive: boolean;
}

export type ScoreSaberBadge = {
  url: string;

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
