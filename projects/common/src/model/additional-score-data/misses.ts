import { prop } from "@typegoose/typegoose";

export class Misses {
  /**
   * The amount of misses notes + bad cuts.
   */
  @prop({ required: true })
  misses!: number;

  /**
   * The total amount of notes that were missed.
   */
  @prop({ required: true })
  missedNotes!: number;

  /**
   * The amount of times a bomb was hit.
   */
  @prop({ required: true })
  bombCuts!: number;

  /**
   * The amount of walls hit in the play.
   */
  @prop({ required: true })
  wallsHit!: number;

  /**
   * The number of bad cuts.
   */
  @prop({ required: true })
  badCuts!: number;
}
