import { PlayerHistory } from "@/common/player/player-history";

/**
 * Gets a value from an {@link PlayerHistory}
 * based on the field
 *
 * @param history the history to get the value from
 * @param field the field to get
 */
export function getValueFromHistory(history: PlayerHistory, field: string): number | null {
  const keys = field.split(".");
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let value: any = history;

  // Navigate through the keys safely
  for (const key of keys) {
    if (value && key in value) {
      value = value[key];
    } else {
      return null; // Return null if the key doesn't exist
    }
  }

  // Ensure we return a number or null
  return typeof value === "number" ? value : null;
}
