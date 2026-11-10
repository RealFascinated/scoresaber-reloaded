import type { UserPreferences, UserPreferencesPatch } from "@ssr/common/schemas/user/preferences";
import { UserPreferencesRepository } from "../../repositories/user-preferences.repository";

export class UserPreferencesService {
  /**
   * Gets the preferences of a user, with the defaults applied.
   *
   * @param userId the user to get the preferences of
   */
  public static get(userId: string): Promise<UserPreferences> {
    return UserPreferencesRepository.get(userId);
  }

  /**
   * Replaces the given preferences of a user, leaving the others untouched.
   *
   * @param userId the user to update the preferences of
   * @param patch the validated preferences to replace
   * @returns the full preferences after the update
   */
  public static patch(userId: string, patch: UserPreferencesPatch): Promise<UserPreferences> {
    return UserPreferencesRepository.patch(userId, patch);
  }
}
