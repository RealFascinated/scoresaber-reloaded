import {getModelForClass, modelOptions, prop, ReturnModelType, Severity} from "@typegoose/typegoose";
import {Document} from "mongoose";
import BeatSaverAuthor from "./author";
import BeatSaverMapVersion from "./map-version";
import BeatSaverMapMetadata from "./map-metadata";

/**
 * The model for a BeatSaver map.
 */
@modelOptions({
  options: { allowMixed: Severity.ALLOW },
  schemaOptions: {
    collection: "beatsaver-maps",
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
   * The name of the map.
   */
  @prop({ required: false })
  public name!: string;

  /**
   * The description of the map.
   */
  @prop({ required: false })
  public description!: string;

  /**
   * The bsr code for the map.
   */
  @prop({ required: false })
  public bsr!: string;

  /**
   * The author of the map.
   */
  @prop({ required: false, _id: false, type: () => BeatSaverAuthor })
  public author!: BeatSaverAuthor;

  /**
   * The versions of the map.
   */
  @prop({ required: false, _id: false, type: () => [BeatSaverMapVersion] })
  public versions!: BeatSaverMapVersion[];

  /**
   * The metadata of the map.
   */
  @prop({ required: false, _id: false, type: () => BeatSaverMapMetadata })
  public metadata!: BeatSaverMapMetadata;

  /**
   * True if the map is not found on beatsaver.
   */
  @prop({ required: false })
  public notFound?: boolean;

  /**
   * The last time the map data was refreshed.
   */
  @prop({ required: true })
  public lastRefreshed!: Date;

  /**
   * Exposes `id` as a virtual field mapped from `_id`.
   */
  public get id(): string {
    return this._id;
  }

  /**
   * Should the map data be refreshed?
   *
   * @returns true if the map data should be refreshed
   */
  public shouldRefresh(): boolean {
    const now = new Date();
    return now.getTime() - this.lastRefreshed.getTime() > 1000 * 60 * 60 * 24 * 3; // 3 days
  }
}

export type BeatSaverMapDocument = BeatSaverMap & Document;
export const BeatSaverMapModel: ReturnModelType<typeof BeatSaverMap> = getModelForClass(BeatSaverMap);
