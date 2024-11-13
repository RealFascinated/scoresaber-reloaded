import { BeatSaverMapResponse } from "../response/beatsaver-map-response";

export interface PlayerScore<S, L> {
  /**
   * The score.
   */
  readonly score: S;

  /**
   * The leaderboard the score was set on.
   */
  readonly leaderboard: L;

  /**
   * The BeatSaver of the song.
   */
  readonly beatSaver?: BeatSaverMapResponse;
}
