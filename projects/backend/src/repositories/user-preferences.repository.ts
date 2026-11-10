import {
  DEFAULT_USER_PREFERENCES,
  UserPreferencesSchema,
  type UserPreferenceKey,
  type UserPreferences,
  type UserPreferencesPatch,
} from "@ssr/common/schemas/user/preferences";
import { eq } from "drizzle-orm";
import { Value } from "typebox/value";
import { db } from "../db";
import { userPreferencesTable } from "../db/schema";

const PREFERENCE_KEYS = Object.keys(UserPreferencesSchema.properties) as UserPreferenceKey[];

export class UserPreferencesRepository {
  /**
   * Applies the defaults to stored preferences. A stored value that no longer matches the
   * schema (or a key that was removed) falls back to its default instead of failing the request.
   *
   * @param stored the sparse preferences from the database
   */
  public static resolve(stored: UserPreferencesPatch | undefined): UserPreferences {
    const resolved: Record<string, UserPreferences[UserPreferenceKey]> = { ...DEFAULT_USER_PREFERENCES };
    for (const key of PREFERENCE_KEYS) {
      const value = stored?.[key];
      if (value !== undefined && Value.Check(UserPreferencesSchema.properties[key], value)) {
        resolved[key] = value;
      }
    }
    return resolved as UserPreferences;
  }

  /**
   * Gets the preferences of a user, with the defaults applied.
   *
   * @param userId the user to get the preferences of
   */
  public static async get(userId: string): Promise<UserPreferences> {
    const [row] = await db
      .select({ preferences: userPreferencesTable.preferences })
      .from(userPreferencesTable)
      .where(eq(userPreferencesTable.userId, userId))
      .limit(1);
    return this.resolve(row?.preferences);
  }

  /**
   * Replaces the given preferences of a user, leaving the others untouched.
   *
   * @param userId the user to update the preferences of
   * @param patch the validated preferences to replace
   * @returns the full preferences after the update
   */
  public static async patch(userId: string, patch: UserPreferencesPatch): Promise<UserPreferences> {
    return db.transaction(async tx => {
      await tx.insert(userPreferencesTable).values({ userId }).onConflictDoNothing();

      // Lock the row so concurrent patches of the same user are applied one after another
      const [row] = await tx
        .select({ preferences: userPreferencesTable.preferences })
        .from(userPreferencesTable)
        .where(eq(userPreferencesTable.userId, userId))
        .for("update");

      // Only known keys are ever stored
      const known = Object.fromEntries(
        Object.entries(patch).filter(([key]) => PREFERENCE_KEYS.some(preferenceKey => preferenceKey === key))
      );
      const merged: UserPreferencesPatch = { ...row?.preferences, ...known };
      await tx
        .update(userPreferencesTable)
        .set({ preferences: merged })
        .where(eq(userPreferencesTable.userId, userId));
      return this.resolve(merged);
    });
  }
}
