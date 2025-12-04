import { prop } from "@typegoose/typegoose";

export default class MapDifficultyParitySummaryToken {
  /**
   * The amount of parity errors.
   */
  @prop()
  public errors!: number;

  /**
   * The amount of parity warnings.
   */
  @prop()
  public warns!: number;

  /**
   * The amount of resets in the difficulty.
   */
  @prop()
  public resets!: number;
}
