import { PlayerHistory } from "../types/player/player-history";

/**
 * Sorts the player history based on date,
 * so the most recent date is first
 *
 * @param history the player history
 */
export function sortPlayerHistory(history: Map<string, PlayerHistory>) {
  return Array.from(history.entries()).sort(
    (a, b) => Date.parse(b[0]) - Date.parse(a[0]) // Sort in descending order
  );
}
