import Leaderboard from "../leaderboard";
import { LeaderboardStatus } from "../leaderboard-status";

export default interface ScoreSaberLeaderboard extends Leaderboard {
  /**
   * The star count for the leaderboard.
   */
  readonly stars: number;

  /**
   * The total amount of plays.
   */
  readonly plays: number;

  /**
   * The amount of plays today.
   */
  readonly dailyPlays: number;

  /**
   * Whether this leaderboard is qualified to be ranked.
   */
  readonly qualified: boolean;

  /**
   * The status of the map.
   */
  readonly status: LeaderboardStatus;
}
