import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { BeatSaverMapResponse } from "@ssr/common/schemas/response/beatsaver/beatsaver-map";

export type OverlayScoreData = {
  /**
   * The current combo.
   */
  combo: number;

  /**
   * The current score.
   */
  score: number;

  /**
   * The current accuracy.
   */
  accuracy: number;
};

export type OverlayMapData = {
  /**
   * The current BeatSaver map data.
   */
  beatSaverMap?: BeatSaverMapResponse;

  /**
   * The ScoreSaber leaderboard associated with the map's hash.
   */
  leaderboard?: ScoreSaberLeaderboard;
};

export type OverlayData = {
  /**
   * The current score data, undefined if not in a score.
   */
  score?: OverlayScoreData;

  /**
   * The current map data, undefined if not in a song.
   */
  map?: OverlayMapData;

  /**
   * Whether the song is paused.
   */
  paused?: boolean;
};
