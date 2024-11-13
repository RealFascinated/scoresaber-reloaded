import { BeatSaverMapResponse } from "./beatsaver-map-response";

export type LeaderboardResponse<L> = {
  /**
   * The leaderboard.
   */
  leaderboard: L;

  /**
   * The beatsaver map.
   */
  beatsaver?: BeatSaverMapResponse;

  /**
   * Was this leaderboard cached locally?
   */
  cached?: boolean;
};
