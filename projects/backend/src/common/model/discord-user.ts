import { getModelForClass, modelOptions, prop, ReturnModelType, Severity } from "@typegoose/typegoose";
import { Document } from "mongoose";

/**
 * The model for a discord user.
 */
@modelOptions({
  options: { allowMixed: Severity.ALLOW },
  schemaOptions: { collection: "discord-users" },
})
export class DiscordUser {
  /**
   * The id of the player.
   */
  @prop()
  public _id!: string;

  /**
   * The ScoreSaber id of the user.
   */
  @prop()
  public scoreSaberId?: string;
}

export type DiscordUserDocument = DiscordUser & Document;
export const DiscordUserModel: ReturnModelType<typeof DiscordUser> = getModelForClass(DiscordUser);
