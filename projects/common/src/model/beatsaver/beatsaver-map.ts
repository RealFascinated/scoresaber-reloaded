import { getModelForClass, modelOptions, prop, ReturnModelType, Severity } from "@typegoose/typegoose";
import { Document } from "mongoose";
import BeatsaverAuthor from "./beatsaver-author";

/**
 * The model for a BeatSaver map.
 */
@modelOptions({
  options: { allowMixed: Severity.ALLOW },
  schemaOptions: {
    toObject: {
      virtuals: true,
      transform: function (_, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
})
export class BeatSaverMap {
  /**
   * The internal MongoDB ID (_id).
   */
  @prop({ required: true })
  private _id!: string;

  /**
   * The bsr code for the map.
   * @private
   */
  @prop({ required: true })
  public bsr!: string;

  /**
   * The author of the map.
   */
  @prop({ required: true, _id: false, type: () => BeatsaverAuthor })
  public author!: BeatsaverAuthor;

  /**
   * Exposes `id` as a virtual field mapped from `_id`.
   */
  public get id(): string {
    return this._id;
  }
}

export type BeatSaverMapDocument = BeatSaverMap & Document;
export const BeatSaverMapModel: ReturnModelType<typeof BeatSaverMap> = getModelForClass(BeatSaverMap);
