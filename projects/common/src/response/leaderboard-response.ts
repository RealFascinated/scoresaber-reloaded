import { BeatSaverMap } from "../model/beatsaver/map";

export type LeaderboardResponse<L> = {
  /**
   * The leaderboard.
   */
  leaderboard: L;

  /**
   * The beatsaver map.
   */
  beatsaver?: BeatSaverMap;

  /**
   * Was this leaderboard cached locally?
   */
  cached?: boolean;
};
