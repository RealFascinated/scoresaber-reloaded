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
import { ScoreSaberLeaderboardPlayerInfoToken } from "../../../types/token/scoresaber/leaderboard-player-info";
import { ScoreSaberScore } from "./scoresaber-score";
import { ScoreSaberScoreBase } from "./scoresaber-score-base";

@modelOptions({
  options: { allowMixed: Severity.ALLOW },
})
export class ScoreSaberMedalsScoreBase extends ScoreSaberScoreBase {
  /**
   * The player who set the score.
   */
  public playerInfo!: ScoreSaberLeaderboardPlayerInfoToken;

  /**
   * The score of the player who set the score.
   */
  public comparisonScore?: ScoreSaberScore;
}

@modelOptions({
  options: { allowMixed: Severity.ALLOW },
  schemaOptions: {
    collection: "scoresaber-medals-scores",
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
export class ScoreSaberMedalsScoreInternal extends ScoreSaberMedalsScoreBase {
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
