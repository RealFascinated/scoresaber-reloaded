import { BeatSaverMap } from "@ssr/common/schemas/beatsaver/map/map";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";

export type OverlayScoreData = {
  combo: number;

  score: number;

  /**
   * The running accuracy in percent.
   */
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

  /**
   * The song time in seconds at the moment it was last reported by the game, undefined if not in a song.
   */
  songTime?: number;

  /**
   * The length of the song in seconds, undefined if not in a song.
   */
  songLength?: number;

  /**
   * When `songTime` was reported, as epoch ms. Used to interpolate the time between messages.
   */
  songTimeSyncedAt?: number;
};
