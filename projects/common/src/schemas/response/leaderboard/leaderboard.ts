import { LeaderboardStarChange } from "../../leaderboard/leaderboard-star-change";
import { ScoreSaberLeaderboard } from "../../scoresaber/leaderboard/leaderboard";
import { BeatSaverMapResponse } from "../beatsaver/beatsaver-map";

export type LeaderboardResponse = {
  /**
   * The scoresaber leaderboard.
   */
  leaderboard: ScoreSaberLeaderboard;

  /**
   * The beatsaver map associated with this leaderboard.
   */
  beatsaver?: BeatSaverMapResponse;

  /**
   * The star change history for this leaderboard.
   */
  starChangeHistory?: LeaderboardStarChange[];
};
