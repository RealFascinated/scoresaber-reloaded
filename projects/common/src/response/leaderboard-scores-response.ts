import { Metadata } from "../types/metadata";
import { BeatSaverMap } from "../model/beatsaver/beatsaver-map";

export default interface LeaderboardScoresResponse<S, L> {
  /**
   * The scores that were set.
   */
  readonly scores: S[];

  /**
   * The leaderboard that was used.
   */
  readonly leaderboard: L;

  /**
   * The beatsaver map for the song.
   */
  readonly beatSaver?: BeatSaverMap;

  /**
   * The pagination metadata.
   */
  readonly metadata: Metadata;
}
