import { Metadata } from "../types/metadata";
import { BeatSaverMapResponse } from "./beatsaver-map-response";

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
  readonly beatSaver?: BeatSaverMapResponse;

  /**
   * The pagination metadata.
   */
  readonly metadata: Metadata;
}
