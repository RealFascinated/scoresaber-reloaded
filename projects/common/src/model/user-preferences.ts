import {
  getModelForClass,
  modelOptions,
  prop,
  ReturnModelType,
  Severity,
} from "@typegoose/typegoose";

@modelOptions({
  options: { allowMixed: Severity.ALLOW },
  schemaOptions: { collection: "user-preferences" },
})
export class UserPreferences {
  /**
   * The id of the queue
   */
  @prop()
  public accountId!: string;
}

export type UserPreferencesDocument = UserPreferences & Document;
export const UserPreferencesModel: ReturnModelType<typeof UserPreferences> =
  getModelForClass(UserPreferences);
