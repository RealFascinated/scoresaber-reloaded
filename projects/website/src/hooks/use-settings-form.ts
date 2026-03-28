import { useEffect, useRef } from "react";
import { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { useStableLiveQuery } from "./use-stable-live-query";

type SettingConfig<T extends FieldValues> = {
  [K in Path<T>]?: () => Promise<T[K] | undefined> | T[K] | undefined;
};

/**
 * Hook to sync form values with database settings
 *
 * @param form - The react-hook-form instance
 * @param config - Object mapping form field names to database getter functions
 * @param excludeFromSync - Optional array of field names to exclude from automatic syncing
 */
export function useSettingsForm<T extends FieldValues>(
  form: UseFormReturn<T>,
  config: SettingConfig<T>,
  excludeFromSync: Path<T>[] = []
) {
  const configKeys = Object.keys(config) as Path<T>[];

  // Create a single object to hold all setting values
  const settings = useStableLiveQuery(async () => {
    const entries = Object.entries(config) as [
      Path<T>,
      () => Promise<T[Path<T>] | undefined> | T[Path<T>] | undefined,
    ][];
    const results = await Promise.all(entries.map(async ([key, getter]) => [key, await getter()] as const));
    return Object.fromEntries(results) as Partial<T>;
  }, []);

  // True when we have a result object and every field declared in `config` is defined.
  // Note: `Object.values({}).every(...)` is true, so we must key off `configKeys`, not values only.
  const settingsReady = settings !== undefined && configKeys.every(key => settings[key] !== undefined);

  // Only sync external state (DB/theme) into the form once on initial load.
  // Otherwise we overwrite user changes with stale values (e.g. theme dropdown
  // reverting because the query hasn't re-run with the new theme yet).
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (!settingsReady || !settings) return;

    if (hasSyncedRef.current) return;
    hasSyncedRef.current = true;

    const currentValues = form.getValues();
    const updates: Partial<T> = {};

    // Collect all values that need updating
    for (const [key, value] of Object.entries(settings) as [Path<T>, T[Path<T>]][]) {
      // Skip excluded fields
      if (excludeFromSync.includes(key)) continue;

      if (currentValues[key] !== value) {
        updates[key] = value;
      }
    }

    // Batch update all changed values
    for (const [key, value] of Object.entries(updates) as [Path<T>, T[Path<T>]][]) {
      form.setValue(key, value);
    }
  }, [settings, settingsReady, form, excludeFromSync]);

  // Skeleton only when the query has no result yet; `settingsReady` stays for sync gating only.
  return { settings, isLoading: settings === undefined };
}
