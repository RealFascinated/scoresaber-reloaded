import { BeatSaverMap } from "../schemas/beatsaver/map/map";
import { ScoreSaberLeaderboard } from "../schemas/scoresaber/leaderboard/leaderboard";

export interface PlayerScore<T> {
  /**
   * The score.
   */
  readonly score: T;

  /**
   * The leaderboard the score was set on.
   */
  readonly leaderboard: ScoreSaberLeaderboard;

  /**
   * The BeatSaver of the song.
   */
  readonly beatSaver?: BeatSaverMap;
}
