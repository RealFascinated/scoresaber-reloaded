import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";

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
   * The current beatsaver map data.
   */
  beatSaverMap?: BeatSaverMapResponse;
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
