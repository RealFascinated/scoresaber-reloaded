import { Metadata } from "../../../types/metadata";
import { ScoreSaberLeaderboard } from "../../scoresaber/leaderboard/leaderboard";
import { ScoreSaberScore } from "../../scoresaber/score/score";
import { BeatSaverMapResponse } from "../beatsaver/beatsaver-map";

export default interface LeaderboardScoresResponse {
  /**
   * The scores that were set.
   */
  readonly scores: ScoreSaberScore[];

  /**
   * The leaderboard that was used.
   */
  readonly leaderboard: ScoreSaberLeaderboard;

  /**
   * The beatsaver map for the song.
   */
  readonly beatSaver?: BeatSaverMapResponse;

  /**
   * The pagination metadata.
   */
  readonly metadata: Metadata;
}
