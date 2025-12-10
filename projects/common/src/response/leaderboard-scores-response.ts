import { ScoreSaberLeaderboard } from "src/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "src/model/score/impl/scoresaber-score";
import { Metadata } from "../types/metadata";
import { BeatSaverMapResponse } from "./beatsaver-map-response";

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
