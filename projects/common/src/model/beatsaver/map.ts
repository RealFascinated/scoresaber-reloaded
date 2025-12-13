import { getModelForClass, modelOptions, prop, ReturnModelType, Severity } from "@typegoose/typegoose";
import { Document } from "mongoose";
import BeatSaverMapToken from "../../types/token/beatsaver/map";

/**
 * The model for a BeatSaver map.
 */
@modelOptions({
  options: { allowMixed: Severity.ALLOW },
  schemaOptions: {
    collection: "beatsaver-maps",
  },
})
export class BeatSaverMap extends BeatSaverMapToken {
  /**
   * The MongoDB _id, which should be set to the BeatSaver map ID (BSR).
   */
  @prop()
  public _id!: string;
}

export type BeatSaverMapDocument = BeatSaverMap & Document;
export const BeatSaverMapModel: ReturnModelType<typeof BeatSaverMap> = getModelForClass(BeatSaverMap);
