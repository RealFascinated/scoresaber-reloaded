import { BeatSaverMap } from "../../beatsaver/map/map";
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
};
