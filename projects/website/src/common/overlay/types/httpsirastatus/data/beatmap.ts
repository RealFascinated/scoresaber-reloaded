/**
 * bombsCount
 * :
 * 90
 * color
 * :
 * {obstacle: Array(3), environment0: Array(3), environment1Boost: Array(3), environmentW: Array(3), environmentWBoost: Array(3), …}
 * environmentName
 * :
 * "DefaultEnvironment"
 * length
 * :
 * 165475
 * maxRank
 * :
 * "SS"
 * maxScore
 * :
 * 1125275
 * noteJumpSpeed
 * :
 * 18
 * noteJumpStartBeatOffset
 * :
 * -1
 * notesCount
 * :
 * 1231
 * obstaclesCount
 * :
 * 116
 * paused
 * :
 * 1737943722824
 * :
 * null
 * songTimeOffset
 * :
 * 0
 * start
 * :
 * 1737943721153
 */
import { MapDifficulty } from "@ssr/common/score/map-difficulty";
import { MapCharacteristic } from "@ssr/common/types/map-characteristic";

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
