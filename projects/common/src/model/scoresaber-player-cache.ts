import {
  getModelForClass,
  modelOptions,
  prop,
  ReturnModelType,
  Severity,
} from "@typegoose/typegoose";
import { Document } from "mongoose";
import { removeObjectFields } from "src/object.util";
import { ScoreSaberPlayerToken } from "src/types/token/scoresaber/player";
import type { ScoreSaberBio } from "../player/impl/scoresaber-player";
import { ScoreSaberBadge, ScoreSaberPlayerBase } from "../player/impl/scoresaber-player";

@modelOptions({
  options: { allowMixed: Severity.ALLOW },
  schemaOptions: { collection: "scoresaber-player-cache" },
})
export class ScoreSaberPlayerCache implements ScoreSaberPlayerBase {
  @prop({ type: String, required: true })
  public _id!: string;

  @prop({
    get: function (this: any) {
      return this._id;
    },
    set: function (this: any, val: string) {
      this._id = val;
    },
  })
  public id!: string;

  @prop()
  public name!: string;

  @prop()
  public profilePicture!: string;

  @prop()
  public avatar!: string;

  @prop()
  public country!: string;

  @prop()
  public rank!: number;

  @prop()
  public countryRank!: number;

  @prop()
  public hmd?: string | undefined;

  @prop()
  public joinedDate!: Date;

  @prop()
  public bio!: ScoreSaberBio;

  @prop()
  public pp!: number;

  @prop()
  public role!: string | undefined;

  @prop()
  public badges!: ScoreSaberBadge[];

  @prop()
  public permissions!: number;

  @prop()
  public banned!: boolean;

  @prop()
  public inactive!: boolean;

  @prop()
  public lastUpdated!: Date;
}

export type ScoreSaberPlayerCacheDocument = ScoreSaberPlayerCache & Document;
export const ScoreSaberPlayerCacheModel: ReturnModelType<typeof ScoreSaberPlayerCache> =
  getModelForClass(ScoreSaberPlayerCache);

/**
 * Converts a ScoreSaber player cache document to a ScoreSaber player token.
 *
 * @param player the player cache document
 * @returns the player token
 */
export function scoreSaberCachedPlayerToObject(
  playerToken: ScoreSaberPlayerCacheDocument
): ScoreSaberPlayerToken {
  const playerId = playerToken._id;
  return removeObjectFields<ScoreSaberPlayerToken>(
    {
      ...playerToken,
      id: playerId,
    } as unknown as ScoreSaberPlayerToken,
    ["_id", "__v"]
  );
}
