import { Metadata } from "../types/metadata";
import { BeatSaverMap } from "../model/beatsaver/beatsaver-map";
import Score from "../score/score";

export default interface LeaderboardScoresResponse<L> {
  /**
   * The scores that were set.
   */
  readonly scores: Score[];

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
