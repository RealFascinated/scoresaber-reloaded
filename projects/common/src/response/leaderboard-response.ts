import { ScoreSaberLeaderboard } from "../model/leaderboard/impl/scoresaber-leaderboard";
import { BeatSaverMapResponse } from "./beatsaver-map-response";

export type LeaderboardResponse = {
  /**
   * The scoresaber leaderboard.
   */
  leaderboard: ScoreSaberLeaderboard;

  /**
   * The amount of scores that we have
   * tracked for this leaderboard.
   */
  trackedScores: number;

  /**
   * The beatsaver map associated with this leaderboard.
   */
  beatsaver?: BeatSaverMapResponse;

  /**
   * Was this leaderboard cached locally?
   */
  cached?: boolean;
};
