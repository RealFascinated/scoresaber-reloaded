import { BeatSaverMap } from "../model/beatsaver/beatsaver-map";

export type LeaderboardResponse<L> = {
  /**
   * The leaderboard.
   */
  leaderboard: L;

  /**
   * The beatsaver map.
   */
  beatsaver?: BeatSaverMap;
};
