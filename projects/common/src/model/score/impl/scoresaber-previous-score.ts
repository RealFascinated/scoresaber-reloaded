import { AutoIncrementID } from "@typegoose/auto-increment";
import {
  getModelForClass,
  modelOptions,
  plugin,
  ReturnModelType,
  Severity,
} from "@typegoose/typegoose";
import { Document } from "mongoose";
import { ScoreSaberScoreBase } from "./scoresaber-score-base";

@modelOptions({
  options: { allowMixed: Severity.ALLOW },
  schemaOptions: {
    collection: "scoresaber-previous-scores",
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
  trackerModelName: "previous-scores",
  trackerCollection: "increments",
  overwriteModelName: "scoresaber-previous-scores",
})
export class ScoreSaberPreviousScoreInternal extends ScoreSaberScoreBase {}

export type ScoreSaberPreviousScore = InstanceType<typeof ScoreSaberPreviousScoreInternal>;
export type ScoreSaberPreviousScoreDocument = ScoreSaberPreviousScore & Document;
export const ScoreSaberPreviousScoreModel: ReturnModelType<typeof ScoreSaberPreviousScoreInternal> =
  getModelForClass(ScoreSaberPreviousScoreInternal);
