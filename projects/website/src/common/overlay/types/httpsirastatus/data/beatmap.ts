import { MapCharacteristic } from "@ssr/common/schemas/map/map-characteristic";
import { MapDifficulty } from "@ssr/common/schemas/map/map-difficulty";

export type HttpSiraStatus_BeatMapData = {
  /**
   * The name of the song.
   */
  songName: string;

  /**
   * The sub name of the song.
   */
  songSubName: string;

  /**
   * The hash of the song.
   */
  songHash: string;

  /**
   * The song cover art.
   */
  songCover: string;

  /**
   * The BPM of the song.
   */
  songBPM: string;

  /**
   * The name of the song author.
   */
  songAuthorName: string;

  /**
   * The name of the level mapper.
   */
  levelAuthorName: string;

  /**
   * The level id for this map.
   */
  levelId: string;

  /**
   * The difficulty of the map.
   */
  difficultyEnum: MapDifficulty;

  /**
   * The characteristic of the map.
   */
  characteristic: MapCharacteristic;

  /**
   * The amount of bombs in the map.
   */
  bombsCount: number;

  /**
   * The amount of obstacles(e.g. walls) in the map.
   */
  obstaclesCount: number;

  /**
   * The length of the map in milliseconds.
   */
  length: number;

  /**
   * The amount of notes in this difficulty.
   */
  notesCount: number;

  /**
   * The NJS of this difficulty.
   */
  noteJumpSpeed: number;

  /**
   * The offset for the NJS.
   */
  noteJumpStartBeatOffset: number;

  /**
   * The current rank for the song.
   */
  maxRank: string;

  /**
   * The UNIX timestamp for when the song was paused.
   */
  paused: number;

  /**
   * The UNIX timestamp for when the song started.
   */
  start: number;
};
