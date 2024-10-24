import Leaderboard from "../leaderboard";
import LeaderboardDifficulty from "../leaderboard-difficulty";
import ScoreSaberLeaderboardToken from "../../types/token/scoresaber/score-saber-leaderboard-token";
import { getDifficultyFromScoreSaberDifficulty } from "../../utils/scoresaber-utils";
import { parseDate } from "../../utils/time-utils";
import { LeaderboardStatus } from "../leaderboard-status";
import { MapCharacteristic } from "../../types/map-characteristic";

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
