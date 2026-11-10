import { BeatSaverMap } from "@ssr/common/schemas/beatsaver/map/map";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";

export type OverlayScoreData = {
  combo: number;

  score: number;

  accuracy: number;
};

export type OverlayMapData = {
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

  paused?: boolean;
};
