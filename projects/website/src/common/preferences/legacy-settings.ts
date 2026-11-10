import {
  DEFAULT_USER_PREFERENCES,
  UserPreferencesSchema,
  type UserPreferenceKey,
  type UserPreferences,
  type UserPreferencesPatch,
} from "@ssr/common/schemas/user/preferences";
import { SHARED_CONSTS } from "@ssr/common/shared-consts";
import { Value } from "typebox/value";

const LEGACY_DATABASE_NAME = "ssr";
const LEGACY_SETTINGS_STORE = "settings";
const IMPORTED_MARKER_KEY = "ssr:legacy-settings-imported";

/** A value of the old database: a preference, or the old friends (a list of player ids). */
type LegacySettingValue = UserPreferences[UserPreferenceKey] | string[];
type LegacySettingRow = { id: string; value: LegacySettingValue };

/**
 * Whether the settings of the old browser database have already been moved to the account
 * (or there was nothing to move). Once true the old database is never opened again.
 */
export function hasImportedLegacySettings(): boolean {
  try {
    return localStorage.getItem(IMPORTED_MARKER_KEY) === "true";
  } catch {
    // Storage is blocked, never block the app on it
    return true;
  }
}

export function markLegacySettingsImported(): void {
  try {
    localStorage.setItem(IMPORTED_MARKER_KEY, "true");
  } catch {
    // Nothing to do, the import just runs again next time
  }
}

/**
 * Reads the settings of the old IndexedDB database without creating it.
 *
 * @returns the stored rows, or undefined when the database doesn't exist
 */
async function readLegacySettings(): Promise<LegacySettingRow[] | undefined> {
  if (typeof indexedDB === "undefined") {
    return undefined;
  }

  const databases = await indexedDB.databases();
  if (!databases.some(database => database.name === LEGACY_DATABASE_NAME)) {
    return undefined;
  }

  return new Promise((resolve, reject) => {
    const open = indexedDB.open(LEGACY_DATABASE_NAME);
    open.onerror = () => reject(open.error ?? new Error("Failed to open the old settings database"));
    open.onsuccess = () => {
      const database = open.result;
      if (!database.objectStoreNames.contains(LEGACY_SETTINGS_STORE)) {
        database.close();
        resolve([]);
        return;
      }

      const request = database
        .transaction(LEGACY_SETTINGS_STORE, "readonly")
        .objectStore(LEGACY_SETTINGS_STORE)
        .getAll();
      request.onerror = () => {
        database.close();
        reject(request.error ?? new Error("Failed to read the old settings"));
      };
      request.onsuccess = () => {
        database.close();
        resolve(request.result as LegacySettingRow[]);
      };
    };
  });
}

function deleteLegacyDatabase(): Promise<void> {
  return new Promise(resolve => {
    const request = indexedDB.deleteDatabase(LEGACY_DATABASE_NAME);
    // A failed or blocked delete only leaves unused data behind
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

/**
 * Builds the patch that moves the old browser settings into the account. Only valid values are
 * kept, and only for preferences the account hasn't changed yet, so an old browser never
 * overwrites settings made elsewhere.
 *
 * @param rows the rows of the old settings database
 * @param current the preferences stored on the account
 */
export function buildLegacyImportPatch(
  rows: LegacySettingRow[],
  current: UserPreferences
): UserPreferencesPatch {
  const patch: Record<string, LegacySettingValue> = {};
  for (const { id, value } of rows) {
    if (!(id in UserPreferencesSchema.properties)) {
      continue; // e.g. the old main player (comes from the session) and friends (see below)
    }

    const key = id as UserPreferenceKey;
    if (!Value.Equal(current[key], DEFAULT_USER_PREFERENCES[key])) {
      continue;
    }

    if (Value.Check(UserPreferencesSchema.properties[key], value)) {
      patch[key] = value;
    }
  }
  return patch as UserPreferencesPatch;
}

/**
 * Gets the players to follow from the old browser "friends". Nothing is imported when the account
 * already follows someone, so an old browser never changes who you follow elsewhere.
 *
 * @param rows the rows of the old settings database
 * @param followingIds the players the account already follows
 * @param ownPlayerId the player id of the account, which can't be followed
 */
export function buildLegacyFollowingIds(
  rows: LegacySettingRow[],
  followingIds: string[],
  ownPlayerId: string | undefined
): string[] {
  const friends = rows.find(row => row.id === "friends")?.value;
  if (followingIds.length > 0 || !Array.isArray(friends)) {
    return [];
  }

  const valid = friends.filter(
    (friend): friend is string => typeof friend === "string" && /^[A-Za-z0-9_-]{1,32}$/.test(friend)
  );
  return [...new Set(valid)].filter(id => id !== ownPlayerId).slice(0, SHARED_CONSTS.maxFollowing);
}

type LegacyImportTarget = {
  /** The preferences stored on the account. */
  preferences: UserPreferences;
  /** The players the account already follows. */
  followingIds: string[];
  /** The player id of the account. */
  playerId: string | undefined;
  /** Saves a patch to the account, must throw when it fails. */
  savePreferences: (patch: UserPreferencesPatch) => Promise<void>;
  /** Follows a player, must throw when it fails. */
  follow: (playerId: string) => Promise<void>;
};

/**
 * Moves the old browser settings and friends into the account, once.
 *
 * @param target the account to move them into
 */
export async function importLegacySettings(target: LegacyImportTarget): Promise<void> {
  const rows = await readLegacySettings();
  if (rows) {
    const patch = buildLegacyImportPatch(rows, target.preferences);
    if (Object.keys(patch).length > 0) {
      await target.savePreferences(patch);
    }
    for (const id of buildLegacyFollowingIds(rows, target.followingIds, target.playerId)) {
      await target.follow(id);
    }
    // Only deleted after everything was saved, so a failed import can be retried
    await deleteLegacyDatabase();
  }
  markLegacySettingsImported();
}
