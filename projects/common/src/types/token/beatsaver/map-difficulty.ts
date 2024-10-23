import { MapDifficulty } from "../../../score/map-difficulty";
import { MapDifficultyParitySummaryToken } from "./difficulty-parity-summary";

export type BeatSaverMapDifficultyToken = {
  /**
   * The NJS of this difficulty.
   */
  njs: number;

  /**
   * The NJS offset of this difficulty.
   */
  offset: number;

  /**
   * The amount of notes in this difficulty.
   */
  notes: number;

  /**
   * The amount of bombs in this difficulty.
   */
  bombs: number;

  /**
   * The amount of obstacles in this difficulty.
   */
  obstacles: number;

  /**
   * The notes per second in this difficulty.
   */
  nps: number;

  /**
   * The length of this difficulty in seconds.
   */
  length: number;

  /**
   * The characteristic of this difficulty.
   */
  characteristic: "Standard" | "Lawless";

  /**
   * The difficulty of this difficulty.
   */
  difficulty: MapDifficulty;

  /**
   * The amount of lighting events in this difficulty.
   */
  events: number;

  /**
   * Whether this difficulty uses Chroma.
   */
  chroma: boolean;

  /**
   * Quite frankly I have no fucking idea what these are.
   */
  me: boolean;
  ne: boolean;

  /**
   * Does this difficulty use cinema?
   */
  cinema: boolean;

  /**
   * The length of this difficulty in seconds.
   */
  seconds: number;

  /**
   * The parity summary of this difficulty.
   */
  paritySummary: MapDifficultyParitySummaryToken;

  /**
   * The maximum score of this difficulty.
   */
  maxScore: number;

  /**
   * The custom difficulty label.
   */
  label: string;
};
