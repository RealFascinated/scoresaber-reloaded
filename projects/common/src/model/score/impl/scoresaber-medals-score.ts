import { AutoIncrementID } from "@typegoose/auto-increment";
import {
  getModelForClass,
  index,
  modelOptions,
  plugin,
  prop,
  ReturnModelType,
  Severity,
} from "@typegoose/typegoose";
import { Document } from "mongoose";
import { ScoreSaberScorePublic } from "./scoresaber-score";

@modelOptions({
  options: { allowMixed: Severity.ALLOW },
  schemaOptions: {
    collection: "scoresaber-medals-scores",
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
@plugin(AutoIncrementID, {
  field: "_id",
  startAt: 1,
  trackerModelName: "medals-scores",
  trackerCollection: "increments",
  overwriteModelName: "scoresaber-medals-scores",
})
@index({ playerId: 1, medals: 1 })
export class ScoreSaberMedalsScoreInternal extends ScoreSaberScorePublic {
  /**
   * The amount of medals this score rewarded the player.
   */
  @prop({ required: true })
  medals!: number;
}

export type ScoreSaberMedalsScore = InstanceType<typeof ScoreSaberMedalsScoreInternal>;
export type ScoreSaberMedalsScoreDocument = ScoreSaberMedalsScore & Document;
export const ScoreSaberMedalsScoreModel: ReturnModelType<typeof ScoreSaberMedalsScoreInternal> =
  getModelForClass(ScoreSaberMedalsScoreInternal);
