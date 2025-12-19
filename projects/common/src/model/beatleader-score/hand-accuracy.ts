import { prop } from "@typegoose/typegoose";

export class HandAccuracy {
  /**
   * The left hand accuracy.
   */
  @prop({ required: true })
  left!: number;

  /**
   * The right hand accuracy.
   */
  @prop({ required: true })
  right!: number;
}
