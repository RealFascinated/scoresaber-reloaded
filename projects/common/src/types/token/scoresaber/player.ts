import { ScoreSaberBadgeToken } from "./badge";
import ScoreSaberScoreStatsToken from "./score-stats";

export type ScoreSaberPlayerToken = {
  /**
   * The ID of the player.
   */
  id: string;

  /**
   * The name of the player.
   */
  name: string;

  /**
   * The profile picture of the player.
   */
  profilePicture: string;

  /**
   * The bio of the player.
   */
  bio: string | null;

  /**
   * The country of the player.
   */
  country: string;

  /**
   * The amount of pp the player has.
   */
  pp: number;

  /**
   * The rank of the player.
   */
  rank: number;

  /**
   * The rank the player has in their country.
   */
  countryRank: number;

  /**
   * The role of the player.
   */
  role: string | null;

  /**
   * The badges the player has.
   */
  badges: ScoreSaberBadgeToken[] | null;

  /**
   * The previous 50 days of rank history.
   */
  histories: string;

  /**
   * The score stats of the player.
   */
  scoreStats: ScoreSaberScoreStatsToken;

  /**
   * The permissions of the player. (bitwise)
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
   * The date the player joined ScoreSaber.
   */
  firstSeen: string;
};
