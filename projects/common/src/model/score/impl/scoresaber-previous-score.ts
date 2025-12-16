import { AutoIncrementID } from "@typegoose/auto-increment";
import {
  getModelForClass,
  index,
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
  },
})
@plugin(AutoIncrementID, {
  field: "_id",
  startAt: 1,
  trackerModelName: "previous-scores",
  trackerCollection: "increments",
  overwriteModelName: "scoresaber-previous-scores",
})
@index({ playerId: 1, leaderboardId: 1, timestamp: -1 })
export class ScoreSaberPreviousScoreInternal extends ScoreSaberScoreBase {}

export type ScoreSaberPreviousScore = InstanceType<typeof ScoreSaberPreviousScoreInternal>;
export type ScoreSaberPreviousScoreDocument = ScoreSaberPreviousScore & Document;
export const ScoreSaberPreviousScoreModel: ReturnModelType<typeof ScoreSaberPreviousScoreInternal> =
  getModelForClass(ScoreSaberPreviousScoreInternal);
