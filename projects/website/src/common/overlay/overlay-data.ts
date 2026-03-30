import { BeatSaverMap } from "@ssr/common/schemas/beatsaver/map/map";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";

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
  beatSaverMap?: BeatSaverMap;

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
