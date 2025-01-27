import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";

export type OverlaySongData = {
  /**
   * The current maps beat saver data.
   */
  beatSaverMap: BeatSaverMapResponse | undefined;
};

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

export type OverlayData = {
  /**
   * The current score data, undefined if not in a score.
   */
  score?: OverlayScoreData;

  /**
   * The current song data, undefined if not in a song.
   */
  song?: OverlaySongData;

  /**
   * Whether the song is paused.
   */
  paused?: boolean;
};
