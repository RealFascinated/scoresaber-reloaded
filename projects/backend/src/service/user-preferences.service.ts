import { UserPreferences, UserPreferencesModel } from "@ssr/common/model/user-preferences";

export class UserPreferencesService {
  /**
   * Gets the preferences for a user.
   *
   * @param accountId the account id of the user.
   * @returns the preferences for the user.
   */
  public static async getPreferences(accountId: string) {
    const preferences = await UserPreferencesModel.findOne({ accountId });
    return {
      // todo: insert defaults
      ...preferences,
    } as UserPreferences;
  }
}
