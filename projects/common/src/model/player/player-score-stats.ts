import { prop } from "@typegoose/typegoose";

export class PlayerScoreStats {
  /**
   * The amount of A plays the player has.
   */
  @prop()
  public aPlays?: number;

  /**
   * The amount of S plays the player has.
   */
  @prop()
  public sPlays?: number;

  /**
   * The amount of S+ plays the player has.
   */
  @prop()
  public spPlays?: number;

  /**
   * The amount of SS plays the player has.
   */
  @prop()
  public ssPlays?: number;

  /**
   * The amount of SS+ plays the player has.
   */
  @prop()
  public sspPlays?: number;

  /**
   * The amount of GOD plays the player has.
   */
  @prop()
  public godPlays?: number;
}
