import { useEffect, useRef } from "react";
import { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { useUserPreferences } from "./use-user-preferences";

/**
 * Hook to sync form values with the saved user preferences
 */
export function useSettingsForm<T extends FieldValues>(
  form: UseFormReturn<T>,
  getValues: (preferences: ReturnType<typeof useUserPreferences>["data"]) => Partial<T>,
  excludeFromSync: Path<T>[] = []
) {
  const { data: preferences, isPlaceholderData } = useUserPreferences();

  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (isPlaceholderData || hasSyncedRef.current) {
      return;
    }

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
