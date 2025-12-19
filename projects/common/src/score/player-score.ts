import { ScoreSaberLeaderboard } from "../model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "../model/score/impl/scoresaber-score";
import { BeatSaverMapResponse } from "../schemas/response/beatsaver/beatsaver-map";

export interface PlayerScore {
  /**
   * The score.
   */
  readonly score: ScoreSaberScore;

  /**
   * The leaderboard the score was set on.
   */
  readonly leaderboard: ScoreSaberLeaderboard;

  /**
   * The BeatSaver of the song.
   */
  readonly beatSaver?: BeatSaverMapResponse;
}
