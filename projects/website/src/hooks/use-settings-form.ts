import { useEffect, useRef } from "react";
import { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { useUserPreferences } from "./use-user-preferences";

/**
 * Hook to sync form values with the saved user preferences
 *
 * @param form - The react-hook-form instance
 * @param getValues - Maps the saved preferences to the form values
 * @param excludeFromSync - Optional array of field names to exclude from automatic syncing
 */
export function useSettingsForm<T extends FieldValues>(
  form: UseFormReturn<T>,
  getValues: (preferences: ReturnType<typeof useUserPreferences>["data"]) => Partial<T>,
  excludeFromSync: Path<T>[] = []
) {
  const { data: preferences, isPlaceholderData } = useUserPreferences();

  // Only sync the saved values into the form once on initial load.
  // Otherwise we overwrite user changes with stale values (e.g. theme dropdown
  // reverting because the saved value hasn't been updated yet).
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (isPlaceholderData || hasSyncedRef.current) {
      return;
    }

    // Values that aren't available yet (like the theme before mounting) hold the sync back
    const values = getValues(preferences);
    if (Object.values(values).some(value => value === undefined)) {
      return;
    }
    hasSyncedRef.current = true;

    const currentValues = form.getValues();
    for (const [key, value] of Object.entries(values) as [Path<T>, T[Path<T>]][]) {
      if (excludeFromSync.includes(key) || currentValues[key] === value) {
        continue;
      }
      form.setValue(key, value);
    }
  }, [preferences, isPlaceholderData, form, getValues, excludeFromSync]);

  return { isLoading: isPlaceholderData };
}
