import { ScoreSaberLeaderboard } from "../model/leaderboard/impl/scoresaber-leaderboard";
import { BeatSaverMapResponse } from "./beatsaver-map-response";
import { LeaderboardStarChange } from "./leaderboard-star-change";

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
