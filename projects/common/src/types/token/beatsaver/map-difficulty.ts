import { prop } from "@typegoose/typegoose";
import type { MapDifficulty } from "../../../score/map-difficulty";
import type MapDifficultyParitySummaryToken from "./difficulty-parity-summary";

export default class BeatSaverMapDifficultyToken {
  /**
   * The NJS of this difficulty.
   */
  @prop()
  public njs!: number;

  /**
   * The NJS offset of this difficulty.
   */
  @prop()
  public offset!: number;

  /**
   * The amount of notes in this difficulty.
   */
  @prop()
  public notes!: number;

  /**
   * The amount of bombs in this difficulty.
   */
  @prop()
  public bombs!: number;

  /**
   * The amount of obstacles in this difficulty.
   */
  @prop()
  public obstacles!: number;

  /**
   * The notes per second in this difficulty.
   */
  @prop()
  public nps!: number;

  /**
   * The length of this difficulty in seconds.
   */
  @prop()
  public length!: number;

  /**
   * The characteristic of this difficulty.
   */
  @prop()
  public characteristic!: "Standard" | "Lawless";

  /**
   * The difficulty of this difficulty.
   */
  @prop()
  public difficulty!: MapDifficulty;

  /**
   * The amount of lighting events in this difficulty.
   */
  @prop()
  public events!: number;

  /**
   * Whether this difficulty uses Chroma.
   */
  @prop()
  public chroma!: boolean;

  /**
   * Mapping Extensions
   */
  @prop()
  public me!: boolean;

  /**
   * Noodle Extensions
   */
  @prop()
  public ne!: boolean;

  /**
   * Does this difficulty use cinema?
   */
  @prop()
  public cinema!: boolean;

  /**
   * The length of this difficulty in seconds.
   */
  @prop()
  public seconds!: number;

  /**
   * The parity summary of this difficulty.
   */
  @prop()
  public paritySummary!: MapDifficultyParitySummaryToken;

  /**
   * The maximum score of this difficulty.
   */
  @prop()
  public maxScore!: number;

  /**
   * The custom difficulty label.
   */
  @prop()
  public label!: string;
}
