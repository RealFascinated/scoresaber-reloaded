import { BeatSaverMap } from "../../beatsaver/map/map";
import { LeaderboardStarChange } from "../../leaderboard/leaderboard-star-change";
import { ScoreSaberLeaderboard } from "../../scoresaber/leaderboard/leaderboard";

export type LeaderboardResponse = {
  /**
   * The scoresaber leaderboard.
   */
  leaderboard: ScoreSaberLeaderboard;

  /**
   * The beatsaver map associated with this leaderboard.
   */
  beatsaver?: BeatSaverMap;

  /**
   * The star change history for this leaderboard.
   */
  starChangeHistory?: LeaderboardStarChange[];
};
