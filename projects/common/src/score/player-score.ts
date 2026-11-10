import { BeatSaverMap } from "../schemas/beatsaver/map/map";
import { ScoreSaberLeaderboard } from "../schemas/scoresaber/leaderboard/leaderboard";

export interface PlayerScore<T> {
  readonly score: T;

  readonly leaderboard: ScoreSaberLeaderboard;

  readonly beatSaver?: BeatSaverMap;
}
