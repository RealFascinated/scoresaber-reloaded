import { BeatSaverMapResponse } from "../schemas/response/beatsaver/beatsaver-map";
import { ScoreSaberLeaderboard } from "../schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberScore } from "../schemas/scoresaber/score/score";

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
