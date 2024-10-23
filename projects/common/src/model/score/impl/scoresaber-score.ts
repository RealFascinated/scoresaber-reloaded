import { getModelForClass, modelOptions, plugin, Prop, ReturnModelType, Severity } from "@typegoose/typegoose";
import Score from "../score";
import { Modifier } from "../../../score/modifier";
import ScoreSaberScoreToken from "../../../types/token/scoresaber/score-saber-score-token";
import ScoreSaberLeaderboard from "../../../leaderboard/impl/scoresaber-leaderboard";
import { type ScoreSaberLeaderboardPlayerInfoToken } from "../../../types/token/scoresaber/score-saber-leaderboard-player-info-token";
import { Document } from "mongoose";
import { AutoIncrementID } from "@typegoose/auto-increment";

@modelOptions({
  options: { allowMixed: Severity.ALLOW },
  schemaOptions: {
    collection: "scoresaber-scores",
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
  trackerModelName: "scores",
  trackerCollection: "increments",
  overwriteModelName: "scoresaber-scores",
})
export class ScoreSaberScoreInternal extends Score {
  /**
   * The score's id.
   */
  @Prop({ required: true, index: true })
  public readonly scoreId!: string;

  /**
   * The leaderboard the score was set on.
   */
  @Prop({ required: true, index: true })
  public readonly leaderboardId!: number;

  /**
   * The amount of pp for the score.
   * @private
   */
  @Prop({ required: true })
  public readonly pp!: number;

  /**
   * The weight of the score, or undefined if not ranked.
   * @private
   */
  @Prop()
  public readonly weight?: number;

  /**
   * The max combo of the score.
   */
  @Prop({ required: true })
  public readonly maxCombo!: number;
}

class ScoreSaberScorePublic extends ScoreSaberScoreInternal {
  /**
   * The player who set the score.
   */
  public playerInfo!: ScoreSaberLeaderboardPlayerInfoToken;
}

export type ScoreSaberScore = InstanceType<typeof ScoreSaberScorePublic>;

/**
 * Gets a {@link ScoreSaberScore} from a {@link ScoreSaberScoreToken}.
 *
 * @param token the token to convert
 * @param playerId the id of the player who set the score
 * @param leaderboard the leaderboard the score was set on
 */
export function getScoreSaberScoreFromToken(
  token: ScoreSaberScoreToken,
  leaderboard: ScoreSaberLeaderboard,
  playerId?: string
): ScoreSaberScore {
  const modifiers: Modifier[] =
    token.modifiers == undefined || token.modifiers === ""
      ? []
      : token.modifiers.split(",").map(mod => {
          mod = mod.toUpperCase();
          const modifier = Modifier[mod as keyof typeof Modifier];
          if (modifier === undefined) {
            throw new Error(`Unknown modifier: ${mod}`);
          }
          return modifier;
        });

  return {
    playerId: playerId || token.leaderboardPlayerInfo.id,
    leaderboardId: leaderboard.id,
    difficulty: leaderboard.difficulty.difficulty,
    characteristic: leaderboard.difficulty.characteristic,
    score: token.baseScore,
    accuracy: (token.baseScore / leaderboard.maxScore) * 100,
    rank: token.rank,
    modifiers: modifiers,
    misses: token.missedNotes + token.badCuts,
    missedNotes: token.missedNotes,
    badCuts: token.badCuts,
    fullCombo: token.fullCombo,
    timestamp: new Date(token.timeSet),
    scoreId: token.id,
    pp: token.pp,
    weight: token.weight,
    maxCombo: token.maxCombo,
    playerInfo: token.leaderboardPlayerInfo,
  };
}

export type ScoreSaberScoreDocument = ScoreSaberScore & Document;
export const ScoreSaberScoreModel: ReturnModelType<typeof ScoreSaberScoreInternal> =
  getModelForClass(ScoreSaberScoreInternal);
