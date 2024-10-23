import { MapDifficulty } from "../score/map-difficulty";
import { MapCharacteristic } from "../types/map-characteristic";

export default interface LeaderboardDifficulty {
  /**
   * The id of the leaderboard.
   */
  leaderboardId: number;

  /**
   * The difficulty of the leaderboard.
   */
  difficulty: MapDifficulty;

  /**
   * The characteristic of the leaderboard.
   */
  characteristic: MapCharacteristic;

  /**
   * The raw difficulty of the leaderboard.
   */
  difficultyRaw: string;
}
