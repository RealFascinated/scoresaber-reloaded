import { useEffect } from "react";
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
  // Create a single object to hold all setting values
  const settings = useStableLiveQuery(async () => {
    const entries = Object.entries(config) as [
      Path<T>,
      () => Promise<T[Path<T>] | undefined> | T[Path<T>] | undefined,
    ][];
    const results = await Promise.all(entries.map(async ([key, getter]) => [key, await getter()] as const));
    return Object.fromEntries(results) as Partial<T>;
  }, []);

  useEffect(() => {
    if (!settings) return;

    // Check if all values are loaded (not undefined)
    const allLoaded = Object.values(settings).every(value => value !== undefined);
    if (!allLoaded) return;

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
  }, [settings, form, excludeFromSync]);

  return { settings, isLoading: settings === undefined };
}
